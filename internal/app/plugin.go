package app

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"maps"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"time"

	"github.com/galacius/galacius/internal/config"
	"github.com/galacius/galacius/internal/plugin"
	"github.com/galacius/galacius/internal/storage"
	"github.com/galacius/galacius/packages/core/async"
	"github.com/galacius/galacius/packages/core/kube/dto"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// pluginAckTimeout bounds how long Connect() waits for running plugins to ack a
// cluster-context/active-namespaces push before proceeding anyway (fail open) — a
// slow or wedged plugin process must never hang a cluster switch.
const pluginAckTimeout = 2 * time.Second

// runningPluginCount returns the number of currently-alive plugin processes, used
// as the "how many acks to expect" bound for PublishAndAwaitAck. Excludes disabled,
// crashed, or not-yet-launched loaders — they hold no gRPC subscription and can
// never ack, so counting them would just stall every wait until pluginAckTimeout.
// Best-effort: a plugin can start or exit between this read and the wait completing,
// so callers must already treat a partial ack count as fail-open, not an error.
func (a *App) runningPluginCount() int {
	a.pluginsMu.RLock()
	defer a.pluginsMu.RUnlock()
	count := 0
	for _, loader := range a.pluginLoaders {
		if loader.IsAlive() {
			count++
		}
	}
	return count
}

// clearPluginClusterState tells every running plugin to drop its cached
// activeContext/activeNamespaces labels, and blocks (bounded, fail-open) until each
// acks having done so. Call this as literally the first step of a cluster switch,
// before building the new clientset or resolving the new context's kubeconfig path:
// business HTTP calls reach a plugin's backend directly from its frontend, bypassing
// the host, so without this step a call racing in during the switch could be served
// against the *previous* cluster's still-cached context/namespaces and look like a
// valid (but wrong) answer. Clearing first turns that failure mode into "no active
// context yet" instead of "silently the wrong cluster" — see emitActiveContextToPlugins
// and emitActiveNamespacesToPlugins for the corresponding final, authoritative push.
func (a *App) clearPluginClusterState() {
	if a.grpcServerCfg == nil {
		return
	}
	expected := a.runningPluginCount()
	if expected == 0 {
		return
	}

	server := a.grpcServerCfg.PluginServer()

	clearContextJSON, err := json.Marshal(map[string]bool{"clearing": true})
	if err != nil {
		log.Printf("marshal cluster-context clear payload: %v", err)
	} else if acked := server.PublishAndAwaitAck(string(async.EventTopicClusterContext), string(clearContextJSON), expected, pluginAckTimeout); acked < expected {
		log.Printf("warning: only %d/%d plugins acked cluster-context clear before switch", acked, expected)
	}

	clearNamespacesJSON, err := json.Marshal(map[string]bool{"clearing": true})
	if err != nil {
		log.Printf("marshal active-namespaces clear payload: %v", err)
	} else if acked := server.PublishAndAwaitAck(string(async.EventTopicNamespacesActive), string(clearNamespacesJSON), expected, pluginAckTimeout); acked < expected {
		log.Printf("warning: only %d/%d plugins acked active-namespaces clear before switch", acked, expected)
	}
}

// emitActiveContextToPlugins pushes the active cluster context to all running
// plugins with HTTP backends, and blocks (bounded, fail-open) until each acks
// having applied it — so that once Connect() returns, every plugin's backend is
// already serving the new cluster, closing the race a fire-and-forget push would
// leave open for the direct frontend->plugin-backend HTTP path. Callers must not
// hold a.mu while calling this: GetContextKubeconfigPath takes its own RLock on
// a.mu, and a.mu is not reentrant.
func (a *App) emitActiveContextToPlugins(contextName string) {
	kubeconfigPath, err := a.GetContextKubeconfigPath(contextName)
	if err != nil {
		log.Printf("resolve kubeconfig path for plugin cluster-context push (context %q): %v", contextName, err)
		return
	}
	if a.grpcServerCfg == nil {
		return
	}
	payloadJSON, err := json.Marshal(map[string]string{
		"contextName":    contextName,
		"kubeconfigPath": kubeconfigPath,
	})
	if err != nil {
		log.Printf("marshal cluster-context payload for plugin push (context %q): %v", contextName, err)
		return
	}
	expected := a.runningPluginCount()
	if acked := a.grpcServerCfg.PluginServer().PublishAndAwaitAck(string(async.EventTopicClusterContext), string(payloadJSON), expected, pluginAckTimeout); acked < expected {
		log.Printf("warning: only %d/%d plugins acked cluster-context %q before Connect returned", acked, expected, contextName)
	}
}

// emitActiveNamespacesToPlugins pushes the active namespace filter to all
// running plugins with HTTP backends, and blocks (bounded, fail-open) until each
// acks having applied it — same "wait for confirmed apply" design as
// emitActiveContextToPlugins.
func (a *App) emitActiveNamespacesToPlugins(namespaces []string) {
	if a.grpcServerCfg == nil {
		return
	}
	payloadJSON, err := json.Marshal(map[string][]string{"namespaces": namespaces})
	if err != nil {
		log.Printf("marshal active-namespaces payload for plugin push: %v", err)
		return
	}
	expected := a.runningPluginCount()
	if acked := a.grpcServerCfg.PluginServer().PublishAndAwaitAck(string(async.EventTopicNamespacesActive), string(payloadJSON), expected, pluginAckTimeout); acked < expected {
		log.Printf("warning: only %d/%d plugins acked active-namespaces push before Connect returned", acked, expected)
	}
}

// pluginsRootDir returns the directory all installed plugins live under: ~/.galacius/plugins.
func (a *App) pluginsRootDir() string {
	return storage.Dir("plugins")
}

// PluginAssetDir resolves the actual on-disk directory for an installed
// plugin, for wiring the plugin asset HTTP handler (internal/plugin.NewPluginAssetHandler)
// in main.go. Derived from the loader's binary path rather than
// pluginInstallDir(pluginID) — restoreInstalledPlugins intentionally allows
// the on-disk directory name to differ from the plugin ID (e.g. a local dev
// build under plugins/helm/.output/ with id "helm"), so reconstructing the
// path from pluginsRootDir()+pluginID would 404 for that case. Same
// resolution getInstalledPluginInfo uses.
func (a *App) PluginAssetDir(pluginID string) (string, bool) {
	a.pluginsMu.RLock()
	loader, ok := a.pluginLoaders[pluginID]
	a.pluginsMu.RUnlock()
	if !ok {
		return "", false
	}
	return filepath.Dir(loader.BinaryPath()), true
}

// pluginInstallDir returns the install directory for a single plugin: {pluginsRootDir}/{pluginID}.
func (a *App) pluginInstallDir(pluginID string) string {
	return filepath.Join(a.pluginsRootDir(), pluginID)
}

// restoreInstalledPlugins discovers and restores plugin loaders from disk.
// It runs synchronously during Startup to ensure pluginLoaders is populated
// before any frontend requests arrive. For each plugin directory found,
// it validates the binary is present and executable and the metadata file
// holds a well-formed checksum, then marks the plugin as READY so
// GetInstalledPlugin reports correctly.
func (a *App) restoreInstalledPlugins() {
	// Skip if marketplace feature is disabled; no plugins should be present in that case.
	if !config.IsMarketplaceEnabled() {
		return
	}

	pluginsRoot := a.pluginsRootDir()

	// If plugins directory doesn't exist, return silently (first run).
	entries, err := os.ReadDir(pluginsRoot)
	if err != nil {
		// Directory doesn't exist or can't be read; silently skip.
		return
	}

	for _, entry := range entries {
		// Only process directories.
		if !entry.IsDir() {
			continue
		}

		dirName := entry.Name()

		// Validate directory name to prevent path traversal.
		if !plugin.ValidPluginID(dirName) {
			continue
		}

		// Read and parse metadata from .plugin-metadata.json FIRST.
		// Legacy formats (flat schema, .bundle-sha256-only) are no longer supported.
		metadataPath := filepath.Join(pluginsRoot, dirName, dto.PluginMetadataFile)
		metadataData, metadataErr := os.ReadFile(metadataPath)
		if metadataErr != nil {
			// No metadata file found; skip this directory.
			continue
		}

		var metadata dto.PluginMetadata
		if err := json.Unmarshal(metadataData, &metadata); err != nil {
			// Failed to parse metadata; skip this directory.
			continue
		}

		// Extract plugin ID from metadata. This is the sole source of truth for identity.
		pluginID := metadata.ID
		if pluginID == "" || !plugin.ValidPluginID(pluginID) {
			// Missing or invalid ID field; skip this directory.
			continue
		}

		// Determine the binary base name from metadata; fall back to old hardcoded convention
		// when the field is absent (pre-existing installs).
		binaryName := metadata.Assets.BinaryName
		if binaryName == "" {
			binaryName = fmt.Sprintf("plugin-%s", pluginID)
		}
		if runtime.GOOS == dto.WindowsGOOS {
			binaryName += ".exe"
		}
		binaryPath := filepath.Join(pluginsRoot, dirName, binaryName)

		// Binary must exist, and on non-Windows must be executable.
		binInfo, binErr := os.Stat(binaryPath)
		if binErr != nil {
			continue
		}
		if runtime.GOOS != dto.WindowsGOOS && binInfo.Mode()&0111 == 0 {
			continue
		}

		// Validate bundle checksum format.
		if !plugin.BundleChecksumHexRe.MatchString(metadata.Bundle.SHA256) {
			// Invalid checksum; skip this directory.
			continue
		}

		// Both binary and metadata exist and look valid. Create a loader.
		loader := plugin.NewPluginLoader(pluginID, binaryPath)

		// Check if the plugin is disabled in settings
		a.mu.RLock()
		isDisabled := a.settings.PluginDisabledState[pluginID]
		a.mu.RUnlock()

		// Set status to DISABLED if disabled, otherwise READY
		if isDisabled {
			loader.SetStatus(dto.PluginStatusDisabled)
		} else {
			loader.SetStatus(dto.PluginStatusReady)
		}

		// Add to pluginLoaders map if not already present.
		a.pluginsMu.Lock()
		if _, exists := a.pluginLoaders[pluginID]; !exists {
			a.pluginLoaders[pluginID] = loader
		}
		a.pluginsMu.Unlock()
	}
}

// kubeconfigForRelaunch resolves the kubeconfig path to hand a plugin subprocess
// being (re)launched: the active cluster's kubeconfig if one is connected, or ""
// when none is. Plugins run app-wide regardless of cluster state — cluster
// context/namespaces are synced separately over gRPC once a cluster actually
// connects (see emitActiveContextToPlugins/emitActiveNamespacesToPlugins), never
// via this launch-time argument.
func (a *App) kubeconfigForRelaunch(activeContextName string) string {
	if activeContextName == "" {
		return ""
	}
	kubeconfigPath, err := a.GetContextKubeconfigPath(activeContextName)
	if err != nil {
		return ""
	}
	return kubeconfigPath
}

// launchInstalledPlugins starts every installed, enabled plugin's subprocess at
// app startup, independent of any cluster connection, so app-wide plugin
// surfaces (e.g. a Settings tab) work before the user ever selects a cluster.
// Runs in the background so a slow or failing launch never blocks Startup.
func (a *App) launchInstalledPlugins() {
	a.pluginsMu.RLock()
	loaders := make(map[string]*plugin.PluginLoader, len(a.pluginLoaders))
	maps.Copy(loaders, a.pluginLoaders)
	a.pluginsMu.RUnlock()

	for pluginID, loader := range loaders {
		if loader.Status() != dto.PluginStatusReady || loader.IsAlive() {
			continue
		}
		if a.grpcServerCfg != nil {
			loader.SetHostGRPCPort(a.grpcServerCfg.Port())
			loader.SetTokenManager(a.grpcServerCfg)
		}
		if err := loader.Launch(context.Background(), ""); err != nil {
			log.Printf("plugin %q: startup launch failed: %v", pluginID, err)
		}
	}
}

// prewarmRestoredPlugins launches any installed-but-not-yet-launched plugin
// loaders once a cluster context is active — a safety net for a plugin that
// crashed or failed its app-startup launch (launchInstalledPlugins), so the
// first proxied RPC (e.g. ListHelmCharts) doesn't pay the launch/handshake cost
// synchronously on the Wails IPC path. Runs in the background so a slow or
// failing launch never blocks Connect.
func (a *App) prewarmRestoredPlugins(contextName string) {
	kubeconfigPath, err := a.GetContextKubeconfigPath(contextName)
	if err != nil {
		return
	}

	a.pluginsMu.RLock()
	loaders := make([]*plugin.PluginLoader, 0, len(a.pluginLoaders))
	for _, loader := range a.pluginLoaders {
		loaders = append(loaders, loader)
	}
	a.pluginsMu.RUnlock()

	for _, loader := range loaders {
		if loader.Status() == dto.PluginStatusReady && !loader.IsAlive() {
			if a.grpcServerCfg != nil {
				loader.SetHostGRPCPort(a.grpcServerCfg.Port())
				loader.SetTokenManager(a.grpcServerCfg)
			}
			_ = loader.Launch(context.Background(), kubeconfigPath)
		}
	}
}

// GetInstalledPlugins returns the full status info (as returned by GetInstalledPlugin)
// for every installed plugin, sorted by plugin ID for deterministic output. Each entry
// additionally carries PluginID so callers don't need a separate per-ID round trip.
// Returns an empty slice (not nil) for JSON serialization to produce [] not null.
func (a *App) GetInstalledPlugins() []dto.InstalledPlugin {
	a.pluginsMu.RLock()
	ids := make([]string, 0, len(a.pluginLoaders))
	for id := range a.pluginLoaders {
		ids = append(ids, id)
	}
	a.pluginsMu.RUnlock()

	sort.Strings(ids)

	result := make([]dto.InstalledPlugin, 0, len(ids))
	for _, id := range ids {
		info := a.getInstalledPluginInfo(id)
		info.PluginID = id
		result = append(result, info)
	}
	return result
}

// IsMarketplaceEnabled reports to the frontend whether the plugin
// marketplace feature is enabled, per the MARKETPLACE_ENABLED env var.
func (a *App) IsMarketplaceEnabled() bool {
	return config.IsMarketplaceEnabled()
}

// GetInstalledPlugin returns the status of a plugin by ID.
func (a *App) GetInstalledPlugin(pluginID string) dto.InstalledPlugin {
	// Validate pluginID to prevent path traversal
	if !plugin.ValidPluginID(pluginID) {
		return dto.InstalledPlugin{
			Status: dto.PluginStatusNotInstalled.String(),
			Error:  "invalid plugin ID",
		}
	}

	return a.getInstalledPluginInfo(pluginID)
}

// getInstalledPluginInfo builds the status DTO for a single plugin ID. Callers are
// responsible for validating pluginID beforehand (GetInstalledPlugins only ever
// passes IDs sourced from a.pluginLoaders, which are already validated on insert).
func (a *App) getInstalledPluginInfo(pluginID string) dto.InstalledPlugin {
	a.pluginsMu.RLock()
	loader, ok := a.pluginLoaders[pluginID]
	a.pluginsMu.RUnlock()

	if !ok {
		return dto.InstalledPlugin{
			Status:   dto.PluginStatusNotInstalled.String(),
			Progress: 0,
		}
	}

	status := loader.Status()
	progress := loader.Progress()
	errMsg := ""
	if status == dto.PluginStatusCrashed {
		errMsg = loader.LastError()
	}

	// Resolve the plugin's actual on-disk directory from the loader's binary
	// path rather than assuming pluginInstallDir(pluginID) — restoreInstalledPlugins
	// intentionally allows the directory name to differ from the plugin ID
	// (e.g. a local dev build under plugins/helm/.output/ with id "helm"), so
	// re-deriving the path from pluginID here would silently miss the metadata.
	pluginDir := filepath.Dir(loader.BinaryPath())

	// Read metadata from disk if it exists
	metadataFile := filepath.Join(pluginDir, dto.PluginMetadataFile)
	bundleChecksum := "0000000000000000000000000000000000000000000000000000000000000000"
	installedVersion := ""
	var manifest dto.Manifest
	var releaseTag, installedAt string

	if data, err := os.ReadFile(metadataFile); err == nil {
		var metadata dto.PluginMetadata
		if err := json.Unmarshal(data, &metadata); err == nil {
			bundleChecksum = metadata.Bundle.SHA256
			installedVersion = plugin.NormalizeVersion(metadata.ReleaseTag)
			manifest = metadata.Manifest
			releaseTag = metadata.ReleaseTag
			installedAt = metadata.InstalledAt
		}
	}

	var size int64
	if status == dto.PluginStatusReady || status == dto.PluginStatusCrashed || status == dto.PluginStatusDisabled {
		size = plugin.DirSize(pluginDir)
	}

	return dto.InstalledPlugin{
		Manifest:         manifest,
		ReleaseTag:       releaseTag,
		InstalledAt:      installedAt,
		Status:           status.String(),
		Error:            errMsg,
		Progress:         progress,
		BundleChecksum:   bundleChecksum,
		InstalledVersion: installedVersion,
		Size:             size,
	}
}

// InstallPlugin initiates installation of a plugin by ID, optionally targeting a specific release tag,
// from a specified marketplace source. sourceURL identifies which marketplace (empty = default, otherwise a repo URL).
// If targetTag is empty, fetches the latest release. Otherwise, fetches the specified tag.
// Sets status to INSTALLING synchronously and returns immediately.
// Actual download/verification happens asynchronously.
// Plugin installation is a global metadata-level operation and succeeds regardless of
// active cluster context. Actual plugin feature usage (e.g., helmPluginClient for Helm)
// gates on active context separately, which is correct.
func (a *App) InstallPlugin(pluginID, targetTag, sourceURL string) error {
	// Gate marketplace feature if disabled before acquiring mutex, so disabled calls are clean no-ops.
	if !config.IsMarketplaceEnabled() {
		return fmt.Errorf("marketplace feature is disabled")
	}

	// Validate pluginID to prevent path traversal
	if !plugin.ValidPluginID(pluginID) {
		return fmt.Errorf("invalid plugin ID: %q", pluginID)
	}

	a.pluginsMu.Lock()
	// Check if a removal is in progress for this plugin
	if a.removingPluginIDs[pluginID] {
		a.pluginsMu.Unlock()
		return fmt.Errorf("cannot install plugin %q while a removal is in progress", pluginID)
	}

	loader, ok := a.pluginLoaders[pluginID]
	if !ok {
		// Create a new loader if it doesn't exist
		// Plugin binary path will be ~/.galacius/plugins/{pluginID}/plugin-{pluginID}
		// Add .exe suffix on Windows
		binaryName := fmt.Sprintf("plugin-%s", pluginID)
		if runtime.GOOS == dto.WindowsGOOS {
			binaryName += ".exe"
		}
		binaryPath := filepath.Join(a.pluginInstallDir(pluginID), binaryName)
		loader = plugin.NewPluginLoader(pluginID, binaryPath)
		a.pluginLoaders[pluginID] = loader
	}
	a.pluginsMu.Unlock()

	// Set status to INSTALLING
	loader.SetStatus(dto.PluginStatusInstalling)

	// Resolve token, baseURL, and private flag based on sourceURL. Settings.AccessToken is
	// reserved for the app's own update-check downloads and must never be used
	// as a fallback here: each marketplace repository uses its own configured
	// AccessToken only (empty for the public default marketplace, or if the
	// user left a private repo's token unset — the subsequent fetch will fail
	// naturally with an auth error in that case). The default marketplace
	// (sourceURL == "", no matching MarketplaceRepository) is treated as public.
	a.mu.RLock()
	baseURL := sourceURL
	token := ""
	private := false
	for _, repo := range a.settings.MarketplaceRepositories {
		if repo.URL == sourceURL {
			token = repo.AccessToken
			private = repo.Private
			break
		}
	}
	a.mu.RUnlock()

	// Start async installation in a goroutine
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()

		// 1. Fetch release from GitHub (specific tag if provided, otherwise latest)
		assets, tag, err := plugin.FetchRelease(ctx, baseURL, token, targetTag, private)
		if err != nil {
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("fetch release: %v", err))
			return
		}

		// 2. Fetch manifest index (the release's single source of truth for every plugin it publishes) and parse manifest
		index, err := plugin.FetchManifestIndex(ctx, assets, token)
		if err != nil {
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("fetch manifest index: %v", err))
			return
		}
		manifest, err := plugin.FetchManifest(pluginID, index)
		if err != nil {
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("fetch manifest: %v", err))
			return
		}

		// 3. Check platform compatibility
		if !plugin.IsPlatformSupported(manifest, runtime.GOOS, runtime.GOARCH) {
			errMsg := fmt.Sprintf("unsupported platform: %s/%s", runtime.GOOS, runtime.GOARCH)
			loader.SetStatusWithError(dto.PluginStatusIncompatible, errMsg)
			return
		}

		// 4. Check host version compatibility
		compatible, err := plugin.IsHostVersionCompatible(a.GetVersion(), manifest.MinimumHostVersion, manifest.MaximumHostVersion)
		if err != nil {
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("version check: %v", err))
			return
		}
		if !compatible {
			errMsg := fmt.Sprintf("host version %s not compatible with plugin (requires %s to %s)",
				a.GetVersion(), manifest.MinimumHostVersion, manifest.MaximumHostVersion)
			loader.SetStatusWithError(dto.PluginStatusIncompatible, errMsg)
			return
		}

		// 5. Resolve asset names and locate URLs
		binaryAsset, bundleAsset := plugin.ResolveAssetNames(pluginID, runtime.GOOS, runtime.GOARCH)

		binaryURL, ok := assets.Lookup(binaryAsset)
		if !ok {
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("binary asset %q not found in release %s", binaryAsset, tag))
			return
		}

		bundleURL, ok := assets.Lookup(bundleAsset)
		if !ok {
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("bundle asset %q not found in release %s", bundleAsset, tag))
			return
		}

		pluginDir := a.pluginInstallDir(pluginID)

		// Compute the REAL binary name and dist dir from the manifest.
		// The loader was created with a provisional binary name before the manifest was fetched;
		// now that we have the manifest, update to use the manifest-driven names.
		realBinaryName := manifest.Assets.BinaryName
		if realBinaryName == "" {
			realBinaryName = fmt.Sprintf("plugin-%s", pluginID)
		}
		if runtime.GOOS == dto.WindowsGOOS {
			realBinaryName += ".exe"
		}
		binaryPath := filepath.Join(pluginDir, realBinaryName)
		loader.SetBinaryPath(binaryPath)

		realBundleDir := manifest.Assets.BundleDir
		if realBundleDir == "" {
			realBundleDir = "dist"
		}
		distDir := filepath.Join(pluginDir, realBundleDir)
		metadataPath := filepath.Join(pluginDir, dto.PluginMetadataFile)

		// 5b. Back up any existing installation's assets before touching them,
		// so a failed download/verify/extract below can be rolled back instead
		// of leaving a previously-working plugin half-upgraded.
		backup, err := plugin.BackupPluginAssets(pluginDir, binaryPath, distDir, metadataPath)
		if err != nil {
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("backup existing assets: %v", err))
			return
		}
		installSucceeded := false
		defer func() {
			if installSucceeded {
				if err := backup.Discard(); err != nil {
					log.Printf("plugin %q: discard asset backup: %v", pluginID, err)
				}
				return
			}
			if err := backup.Restore(); err != nil {
				log.Printf("plugin %q: restore asset backup: %v", pluginID, err)
			}
		}()

		// 6. Download and verify binary
		if err := plugin.DownloadToFile(ctx, binaryURL, binaryPath, token, func(pct int) {
			// Map 0-100 binary download to 0-50 overall progress
			loader.SetProgress(pct / 2)
		}); err != nil {
			_ = os.Remove(binaryPath)
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("download binary: %v", err))
			return
		}

		// Prefer platform-specific checksum from manifest.Binaries map, fall back to manifest.Binary
		platformKey := runtime.GOOS + "-" + runtime.GOARCH
		expectedSHA256 := manifest.Binary.SHA256
		if len(manifest.Binaries) > 0 {
			if platformAsset, ok := manifest.Binaries[platformKey]; ok {
				expectedSHA256 = platformAsset.SHA256
			}
		}

		if err := plugin.VerifySHA256(binaryPath, expectedSHA256); err != nil {
			_ = os.Remove(binaryPath)
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("verify binary: %v", err))
			return
		}

		// Make binary executable on Unix
		if runtime.GOOS != dto.WindowsGOOS {
			if err := os.Chmod(binaryPath, 0755); err != nil {
				_ = os.Remove(binaryPath)
				loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("chmod binary: %v", err))
				return
			}
		}

		// 7. Download and verify bundle (tar.gz archive)
		bundleArchivePath := filepath.Join(pluginDir, "dist-bundle.tar.gz.tmp")

		if err := plugin.DownloadToFile(ctx, bundleURL, bundleArchivePath, token, func(pct int) {
			// Map 0-100 bundle download to 50-100 overall progress
			loader.SetProgress(50 + pct/2)
		}); err != nil {
			_ = os.Remove(bundleArchivePath)
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("download bundle: %v", err))
			return
		}

		if err := plugin.VerifySHA256(bundleArchivePath, manifest.Bundle.SHA256); err != nil {
			_ = os.Remove(bundleArchivePath)
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("verify bundle: %v", err))
			return
		}

		// Remove any stale dist/ directory before extraction to avoid leftover chunk files
		// from a previous version (chunk filenames are content-hashed and change between versions).
		// Normally already gone since BackupPluginAssets moved it aside above.
		_ = os.RemoveAll(distDir)

		// Extract the archive
		if err := plugin.ExtractTarGz(bundleArchivePath, distDir); err != nil {
			_ = os.RemoveAll(distDir)
			_ = os.Remove(bundleArchivePath)
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("extract bundle: %v", err))
			return
		}

		// Clean up the temporary archive file
		_ = os.Remove(bundleArchivePath)

		// 7b. Download the logo asset, if the manifest declares one. Best-effort:
		// a missing or failed logo download must not fail the install, since it's
		// cosmetic only (PluginLogo falls back to a placeholder icon on load error).
		if manifest.Assets.Logo != "" {
			logoAssetName := plugin.ResolveLogoAssetName(pluginID, manifest.Assets.Logo)
			if logoURL, ok := assets.Lookup(logoAssetName); ok {
				logoPath := filepath.Join(pluginDir, manifest.Assets.Logo)
				if err := plugin.DownloadToFile(ctx, logoURL, logoPath, token, nil); err != nil {
					log.Printf("plugin %q: download logo: %v", pluginID, err)
				}
			}
		}

		// 8. Persist metadata last, only after binary + bundle are downloaded,
		// verified, and extracted. Writing it any earlier risks clobbering a
		// previously valid installation's metadata with info for a version
		// that never finished downloading, breaking restoreInstalledPlugins.
		finalMetadata := dto.PluginMetadata{
			Manifest:    *manifest,
			ReleaseTag:  tag,
			InstalledAt: time.Now().Format(time.RFC3339),
		}
		finalMetadataJSON, err := json.Marshal(finalMetadata)
		if err != nil {
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("marshal metadata: %v", err))
			return
		}
		if err := plugin.WriteMetadataAtomically(metadataPath, finalMetadataJSON); err != nil {
			loader.SetStatusWithError(dto.PluginStatusCrashed, fmt.Sprintf("persist metadata: %v", err))
			return
		}

		// Download/verify/extract/metadata all succeeded, so the old assets'
		// backup is no longer needed and will be discarded by the deferred cleanup.
		installSucceeded = true

		// 9. Launch the plugin now — it runs app-wide, independent of any active
		// cluster context. A failure here is not install failure — the binary and
		// metadata are already valid, so fall through to READY and let
		// GetPluginBackendAddr's lazy-launch retry on first use.
		a.mu.RLock()
		activeContextName := a.activeContext
		a.mu.RUnlock()

		if a.grpcServerCfg != nil {
			loader.SetHostGRPCPort(a.grpcServerCfg.Port())
			loader.SetTokenManager(a.grpcServerCfg)
		}
		launchFailed := false
		if launchErr := loader.Launch(ctx, a.kubeconfigForRelaunch(activeContextName)); launchErr != nil {
			fmt.Printf("plugin %q: post-install launch failed: %v\n", pluginID, launchErr)
			launchFailed = true
		}

		if !launchFailed {
			loader.SetStatus(dto.PluginStatusReady)
		}
	}()

	return nil
}

// RemovePlugin uninstalls an installed plugin by ID, removing its binary,
// bundle, metadata, and lock file from disk. The plugin process is gracefully
// shut down if running. Returns an error if the plugin is not installed or
// is currently installing. If the plugin is on disk but not in the loaders map
// (orphaned), it is still removed.
func (a *App) RemovePlugin(pluginID string) error {
	// Gate marketplace feature if disabled before acquiring mutex, so disabled calls are clean no-ops.
	if !config.IsMarketplaceEnabled() {
		return fmt.Errorf("marketplace feature is disabled")
	}

	// Validate pluginID to prevent path traversal
	if !plugin.ValidPluginID(pluginID) {
		return fmt.Errorf("invalid plugin ID: %q", pluginID)
	}

	pluginDir := a.pluginInstallDir(pluginID)

	// Acquire lock to check installation status and mark removal in progress
	// atomically, so no InstallPlugin call can slip in between the check and
	// the removingPluginIDs flag being set.
	a.pluginsMu.Lock()

	// Check if an installation is already in progress for this plugin
	if a.pluginLoaders[pluginID] != nil && a.pluginLoaders[pluginID].Status() == dto.PluginStatusInstalling {
		a.pluginsMu.Unlock()
		return fmt.Errorf("cannot remove plugin %q while installation is in progress", pluginID)
	}

	// Get the loader if it exists (may be nil for orphaned directories)
	loader, loaderExists := a.pluginLoaders[pluginID]

	// Mark removal in progress before releasing the lock so a concurrent
	// InstallPlugin call sees it immediately (see the removingPluginIDs check
	// added to InstallPlugin above).
	a.removingPluginIDs[pluginID] = true
	a.pluginsMu.Unlock()

	// Check if plugin exists (either in map or on disk)
	dirExists := false
	if _, err := os.Stat(pluginDir); err == nil {
		dirExists = true
	}

	if !loaderExists && !dirExists {
		// Not in map and not on disk — truly not installed
		a.pluginsMu.Lock()
		delete(a.removingPluginIDs, pluginID)
		a.pluginsMu.Unlock()
		return fmt.Errorf("plugin %q is not installed", pluginID)
	}

	// Shutdown the plugin if a loader exists, while holding the lock to prevent
	// prewarmRestoredPlugins from snapshotting a loader mid-shutdown
	a.pluginsMu.Lock()
	if loaderExists && loader != nil {
		if err := loader.Shutdown(); err != nil {
			// Log but don't fail — we still want to delete the files
			fmt.Printf("plugin shutdown warning: %v\n", err)
		}
	}
	a.pluginsMu.Unlock()

	// Delete the plugin directory recursively (works whether loader exists or not)
	var removeErr error
	if err := os.RemoveAll(pluginDir); err != nil {
		// Check if the directory still exists; if not, treat as success
		if _, statErr := os.Stat(pluginDir); os.IsNotExist(statErr) {
			removeErr = nil
		} else {
			removeErr = fmt.Errorf("removing plugin directory %q: %w", pluginDir, err)
		}
	}

	// Clean up tracking
	a.pluginsMu.Lock()
	delete(a.removingPluginIDs, pluginID)
	// Only delete the loader if it exists
	if loaderExists {
		delete(a.pluginLoaders, pluginID)
	}
	a.pluginsMu.Unlock()

	// Delete from disabled state and persist
	a.mu.Lock()
	delete(a.settings.PluginDisabledState, pluginID)
	config.Save(a.settings)
	a.mu.Unlock()

	return removeErr
}

// DisablePlugin disables an installed plugin by ID. The plugin process is shut down
// if running, and the plugin is marked as DISABLED in the disabled state map and persisted to disk.
// Returns an error if the plugin is not installed.
func (a *App) DisablePlugin(pluginID string) error {
	// Gate marketplace feature if disabled
	if !config.IsMarketplaceEnabled() {
		return fmt.Errorf("marketplace feature is disabled")
	}

	// Validate pluginID to prevent path traversal
	if !plugin.ValidPluginID(pluginID) {
		return fmt.Errorf("invalid plugin ID: %q", pluginID)
	}

	// Look up the loader to check if the plugin is installed
	a.pluginsMu.RLock()
	loader, ok := a.pluginLoaders[pluginID]
	a.pluginsMu.RUnlock()

	if !ok {
		return fmt.Errorf("plugin %q is not installed", pluginID)
	}

	// Shut down the plugin if it's running (do this outside any lock)
	if loader.IsAlive() {
		if err := loader.Shutdown(); err != nil {
			log.Printf("plugin %q shutdown warning: %v", pluginID, err)
		}
	}

	// Update settings and mark plugin as disabled
	a.mu.Lock()
	if a.settings.PluginDisabledState == nil {
		a.settings.PluginDisabledState = make(map[string]bool)
	}
	a.settings.PluginDisabledState[pluginID] = true
	if err := config.Save(a.settings); err != nil {
		a.mu.Unlock()
		return fmt.Errorf("failed to save settings: %w", err)
	}
	a.mu.Unlock()

	// Set loader status to DISABLED
	loader.SetStatus(dto.PluginStatusDisabled)

	// Emit plugin:disabled event (skip if context is invalid, e.g. in tests)
	if a.ctx != nil {
		wailsruntime.EventsEmit(a.ctx, "plugin:disabled", pluginID)
	}

	return nil
}

// EnablePlugin enables a disabled plugin by ID and launches its subprocess (app-wide,
// independent of any active cluster context). Returns an error if the plugin is not installed.
func (a *App) EnablePlugin(pluginID string) error {
	// Gate marketplace feature if disabled
	if !config.IsMarketplaceEnabled() {
		return fmt.Errorf("marketplace feature is disabled")
	}

	// Validate pluginID to prevent path traversal
	if !plugin.ValidPluginID(pluginID) {
		return fmt.Errorf("invalid plugin ID: %q", pluginID)
	}

	// Look up the loader to check if the plugin is installed
	a.pluginsMu.RLock()
	loader, ok := a.pluginLoaders[pluginID]
	a.pluginsMu.RUnlock()

	if !ok {
		return fmt.Errorf("plugin %q is not installed", pluginID)
	}

	// Update settings to remove from disabled state and persist
	a.mu.Lock()
	delete(a.settings.PluginDisabledState, pluginID)
	if err := config.Save(a.settings); err != nil {
		a.mu.Unlock()
		return fmt.Errorf("failed to save settings: %w", err)
	}
	// Capture the active context before releasing the lock
	activeContextName := a.activeContext
	a.mu.Unlock()

	// Set loader status to READY
	loader.SetStatus(dto.PluginStatusReady)

	// Launch the plugin now — it runs app-wide, independent of any active
	// cluster context.
	if a.grpcServerCfg != nil {
		loader.SetHostGRPCPort(a.grpcServerCfg.Port())
		loader.SetTokenManager(a.grpcServerCfg)
	}
	if err := loader.Launch(context.Background(), a.kubeconfigForRelaunch(activeContextName)); err != nil {
		// Log but don't fail — the plugin is now enabled and will be relaunched on next use
		log.Printf("plugin %q: launch failed: %v", pluginID, err)
	}

	// Emit plugin:enabled event (skip if context is invalid, e.g. in tests)
	if a.ctx != nil {
		wailsruntime.EventsEmit(a.ctx, "plugin:enabled", pluginID)
	}

	return nil
}

// GetPluginsFromMarketplace fetches manifests from the default marketplace and all
// user-configured repositories concurrently. It returns a merged slice of manifests
// with SourceURL set appropriately (empty string for default, repository URL for user-added).
// Errors from individual sources are aggregated in the Errors map, keyed by source identifier.
func (a *App) GetPluginsFromMarketplace() *dto.MarketplaceResult {
	// Gate marketplace feature if disabled
	if !config.IsMarketplaceEnabled() {
		// "marketplace" key is reserved for this global feature-gate error; per-source/per-plugin errors use other keys.
		return &dto.MarketplaceResult{
			Errors: map[string]string{
				"marketplace": "marketplace feature is disabled",
			},
		}
	}

	a.mu.RLock()
	repositories := make([]config.MarketplaceRepository, len(a.settings.MarketplaceRepositories))
	copy(repositories, a.settings.MarketplaceRepositories)
	a.mu.RUnlock()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Prepare list of sources to fetch from settings.MarketplaceRepositories.
	// There is no implicit built-in default source here: config.Load provisions
	// the official galacius marketplace (config.GetMarketplaceBaseURL) as the
	// first MarketplaceRepositories entry on first run, so it already appears
	// in repositories like any other entry. Once persisted, it's ordinary user
	// settings — if the user edits or removes it, that choice is respected
	// with no fallback to re-adding it here. Settings.AccessToken is reserved
	// for the app's own update-check downloads and must never be used as a
	// fallback here: each marketplace repository uses its own configured
	// AccessToken only (empty if the user left a private repo's token unset).
	type source struct {
		sourceURL string
		token     string
		private   bool
	}

	sources := make([]source, 0, len(repositories))
	for _, repo := range repositories {
		if repo.Disabled {
			continue
		}
		sources = append(sources, source{
			sourceURL: repo.URL,
			token:     repo.AccessToken,
			private:   repo.Private,
		})
	}

	// Fetch all sources concurrently via channels
	type fetchResult struct {
		manifests   []*dto.Manifest
		sourceIndex int
		errors      map[string]string // keyed sourceLabel+":release" or sourceLabel+":"+pluginID
	}

	resultsChan := make(chan fetchResult, len(sources))
	for i, src := range sources {
		go func(sourceIndex int, src source) {
			sourceLabel := src.sourceURL
			if sourceLabel == "" {
				sourceLabel = "default"
			}

			assets, _, err := plugin.FetchLatestRelease(ctx, src.sourceURL, src.token, src.private)
			if err != nil {
				resultsChan <- fetchResult{
					manifests:   nil,
					sourceIndex: sourceIndex,
					errors:      map[string]string{sourceLabel + ":release": err.Error()},
				}
				return
			}

			// Fetch the manifest index — the release's single source of truth for every plugin it publishes
			index, err := plugin.FetchManifestIndex(ctx, assets, src.token)
			if err != nil {
				resultsChan <- fetchResult{
					manifests:   nil,
					sourceIndex: sourceIndex,
					errors:      map[string]string{sourceLabel + ":manifest-index": err.Error()},
				}
				return
			}

			pluginIDs := plugin.DiscoverPluginIDs(index)
			manifests := make([]*dto.Manifest, 0, len(pluginIDs))
			srcErrors := make(map[string]string)

			for _, pluginID := range pluginIDs {
				manifest, err := plugin.FetchManifest(pluginID, index)
				if err != nil {
					log.Printf("plugin marketplace: %s from %q: fetch manifest failed: %v", pluginID, src.sourceURL, err)
					srcErrors[sourceLabel+":"+pluginID] = err.Error()
					continue
				}
				manifest.SourceURL = src.sourceURL
				if manifest.Assets.Logo != "" {
					logoAssetName := plugin.ResolveLogoAssetName(pluginID, manifest.Assets.Logo)
					if logoURL, ok := assets.Lookup(logoAssetName); ok {
						manifest.LogoURL = logoURL
					}
				}
				manifests = append(manifests, manifest)
			}

			resultsChan <- fetchResult{
				manifests:   manifests,
				sourceIndex: sourceIndex,
				errors:      srcErrors,
			}
		}(i, src)
	}

	// Collect results. Results arrive in non-deterministic (goroutine
	// completion) order, so buffer them keyed by source index and merge in
	// configured source order below — default marketplace first, then
	// user-added repositories in the order they're configured.
	resultsBySourceIndex := make([]fetchResult, len(sources))
	for range sources {
		result := <-resultsChan
		resultsBySourceIndex[result.sourceIndex] = result
	}

	// Merge in source order, deduplicating by plugin ID so the same plugin
	// published by more than one configured source (e.g. a mirrored
	// repository) is listed once, keeping the earliest (highest-priority)
	// source's manifest.
	allManifests := make([]*dto.Manifest, 0)
	errors := make(map[string]string)
	seenPluginIDs := make(map[string]bool)

	for _, result := range resultsBySourceIndex {
		maps.Copy(errors, result.errors)
		for _, manifest := range result.manifests {
			if seenPluginIDs[manifest.ID] {
				continue
			}
			seenPluginIDs[manifest.ID] = true
			allManifests = append(allManifests, manifest)
		}
	}

	return &dto.MarketplaceResult{
		Manifests: allManifests,
		Errors:    errors,
	}
}

// GetPluginBackendAddr returns the HTTP address (host:port) for a plugin's backend.
// Returns an error if the plugin is not installed, not running, or if the lock file cannot be read.
func (a *App) GetPluginBackendAddr(pluginID string) (string, error) {
	if !plugin.ValidPluginID(pluginID) {
		return "", fmt.Errorf("invalid plugin ID: %q", pluginID)
	}

	a.pluginsMu.RLock()
	loader, ok := a.pluginLoaders[pluginID]
	a.pluginsMu.RUnlock()

	if !ok {
		return "", fmt.Errorf("plugin %q is not installed", pluginID)
	}

	if loader.Status() == dto.PluginStatusDisabled {
		return "", fmt.Errorf("plugin %q is disabled", pluginID)
	}

	// Capture activeContextName once for reuse in both the PID-liveness branch
	// and the TCP-dial relaunch branch below.
	a.mu.RLock()
	activeContextName := a.activeContext
	a.mu.RUnlock()

	if !loader.IsAlive() {
		// Lazily relaunch: the plugin may have crashed, been killed externally, or
		// simply hasn't started yet (launchInstalledPlugins/prewarmRestoredPlugins
		// only relaunch at startup/Connect, not on-demand). Plugins run app-wide,
		// so this must succeed with no active cluster context too — pass whatever
		// kubeconfig is available (possibly none).
		kubeconfigPath := a.kubeconfigForRelaunch(activeContextName)

		if a.grpcServerCfg != nil {
			loader.SetHostGRPCPort(a.grpcServerCfg.Port())
			loader.SetTokenManager(a.grpcServerCfg)
		}
		if err := loader.Launch(context.Background(), kubeconfigPath); err != nil {
			return "", fmt.Errorf("plugin %q: relaunch failed: %w", pluginID, err)
		}
	}

	port, err := loader.HTTPPort()
	if err != nil {
		return "", fmt.Errorf("plugin %q: read HTTP port: %v", pluginID, err)
	}

	if port < 1 || port > 65535 {
		return "", fmt.Errorf("plugin %q: invalid port %d", pluginID, port)
	}

	addr := fmt.Sprintf("127.0.0.1:%d", port)

	// PID is alive but the HTTP listener may not be accepting connections yet
	// (startup race between the READY handshake and the listener binding) or
	// may have died internally without killing the process. IsAlive() can't detect
	// this — do a fast TCP dial check and force a clean relaunch on failure.
	conn, dialErr := net.DialTimeout("tcp", addr, 1*time.Second)
	if dialErr == nil {
		conn.Close()
		return addr, nil
	}

	// Backend not responding. Try to relaunch, with or without an active cluster context.
	if err := loader.Shutdown(); err != nil {
		fmt.Printf("plugin %q: shutdown before relaunch: %v\n", pluginID, err)
	}

	kubeconfigPath := a.kubeconfigForRelaunch(activeContextName)
	if a.grpcServerCfg != nil {
		loader.SetHostGRPCPort(a.grpcServerCfg.Port())
		loader.SetTokenManager(a.grpcServerCfg)
	}
	if err := loader.Launch(context.Background(), kubeconfigPath); err != nil {
		return "", fmt.Errorf("plugin %q: backend not responding, relaunch failed: %w", pluginID, err)
	}

	port, err = loader.HTTPPort()
	if err != nil {
		return "", fmt.Errorf("plugin %q: read HTTP port after relaunch: %v", pluginID, err)
	}
	addr = fmt.Sprintf("127.0.0.1:%d", port)

	conn, dialErr = net.DialTimeout("tcp", addr, 1*time.Second)
	if dialErr != nil {
		return "", fmt.Errorf("plugin %q: backend unreachable after relaunch", pluginID)
	}
	conn.Close()
	return addr, nil
}
