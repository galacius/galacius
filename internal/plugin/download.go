package plugin

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	neturl "net/url"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/galacius/galacius/internal/config"
	"github.com/galacius/galacius/internal/lib/github_release"
	"github.com/galacius/galacius/packages/core/kube/dto"
)

// ReleaseAssets resolves a release asset's download URL by name. In
// authenticated/API mode it's backed by the asset listing GitHub's JSON API
// returned. In unauthenticated (public, no token) mode, GitHub release asset
// URLs are deterministic (releases/download/<tag>/<name>), so URLs are
// constructed on lookup with no further network call.
type ReleaseAssets struct {
	tag      string
	fromMap  map[string]string // non-nil in authenticated/API mode
	htmlBase string            // non-empty in unauthenticated mode (e.g. https://github.com/owner/repo)
}

// Lookup returns the download URL for an asset by name, and whether the asset exists.
// In authenticated/API mode, returns the pre-fetched asset map value.
// In unauthenticated mode, constructs and returns the deterministic GitHub release download URL.
func (a ReleaseAssets) Lookup(name string) (string, bool) {
	if a.fromMap != nil {
		url, ok := a.fromMap[name]
		return url, ok
	}
	if a.htmlBase == "" {
		return "", false
	}
	return fmt.Sprintf("%s/releases/download/%s/%s", a.htmlBase, neturl.PathEscape(a.tag), name), true
}

// manifestIndexAssetName is the repo-wide release asset that acts as the
// single source of truth for every plugin published in a release: it embeds
// each plugin's complete manifest directly, so no separate per-plugin
// manifest asset is needed (or published by real galacius-plugins releases).
const manifestIndexAssetName = "manifest.json"

// FetchLatestRelease fetches the latest release from GitHub.
// If baseURL is empty, uses config.GetMarketplaceBaseURL() (env-var/default behavior).
// private indicates whether to use the authenticated API asset endpoint (asset.URL) for private repos
// or the public browser_download_url (asset.BrowserDownloadURL) for public repos.
//
// For a public repository with no token (private=false, token=""), baseURL is expected
// in the public form https://github.com/<owner>/<repo> (matching GetReleasesBaseURL's
// default shape): the latest tag is resolved via GitHub's unauthenticated releases/latest
// redirect and asset URLs are constructed deterministically (releases/download/<tag>/<name>),
// bypassing the api.github.com 60 req/hr rate limit entirely — no API call is made.
//
// For a private repository or when a token is supplied, baseURL is expected in the
// api.github.com form https://api.github.com/repos/<owner>/<repo>/releases, and the
// release plus its full asset listing are fetched via GitHub's authenticated REST API.
//
// Returns ReleaseAssets (which resolves asset URLs on demand) and the release tag name.
func FetchLatestRelease(ctx context.Context, baseURL, token string, private bool) (ReleaseAssets, string, error) {
	if baseURL == "" {
		baseURL = config.GetMarketplaceBaseURL()
	}

	if !private && token == "" {
		tag, err := githubrelease.ResolveLatestTag(ctx, baseURL)
		if err != nil {
			return ReleaseAssets{}, "", err
		}
		return ReleaseAssets{tag: tag, htmlBase: baseURL}, tag, nil
	}

	// Authenticated API path (private repo or token supplied)
	url := baseURL + "/latest"
	req, err := githubrelease.NewAPIRequest(ctx, url, token)
	if err != nil {
		return ReleaseAssets{}, "", fmt.Errorf("creating request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return ReleaseAssets{}, "", fmt.Errorf("fetching release: %w", err)
	}
	defer resp.Body.Close()

	if err := githubrelease.CheckAPIResponse(resp); err != nil {
		return ReleaseAssets{}, "", err
	}

	var release dto.GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return ReleaseAssets{}, "", fmt.Errorf("parsing release JSON: %w", err)
	}

	assets := make(map[string]string)
	for _, asset := range release.Assets {
		if private {
			assets[asset.Name] = asset.URL
		} else {
			assets[asset.Name] = asset.BrowserDownloadURL
		}
	}

	return ReleaseAssets{tag: release.TagName, fromMap: assets}, release.TagName, nil
}

// FetchRelease fetches a specific release by tag from GitHub.
// If baseURL is empty, uses config.GetMarketplaceBaseURL() (env-var/default behavior).
// If tag is empty, behaves identically to FetchLatestRelease.
// private indicates whether to use the authenticated API asset endpoint (asset.URL) for private repos
// or the public browser_download_url (asset.BrowserDownloadURL) for public repos.
//
// For a public repository with no token (private=false, token=""), baseURL is expected
// in the public form https://github.com/<owner>/<repo>; since the tag is already known,
// asset URLs are constructed deterministically with no API call at all.
// For a private repository or when a token is supplied, baseURL is expected in the
// api.github.com form https://api.github.com/repos/<owner>/<repo>/releases, and the
// release plus its full asset listing are fetched via GitHub's authenticated REST API.
//
// Returns ReleaseAssets (which resolves asset URLs on demand) and the tag name.
func FetchRelease(ctx context.Context, baseURL, token, tag string, private bool) (ReleaseAssets, string, error) {
	if tag == "" {
		return FetchLatestRelease(ctx, baseURL, token, private)
	}

	if baseURL == "" {
		baseURL = config.GetMarketplaceBaseURL()
	}

	if !private && token == "" {
		// Tag is known; asset URLs are deterministic, no API call needed.
		return ReleaseAssets{tag: tag, htmlBase: baseURL}, tag, nil
	}

	// Authenticated API path (private repo or token supplied)
	url := baseURL + "/tags/" + neturl.PathEscape(tag)
	req, err := githubrelease.NewAPIRequest(ctx, url, token)
	if err != nil {
		return ReleaseAssets{}, "", fmt.Errorf("creating request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return ReleaseAssets{}, "", fmt.Errorf("fetching release: %w", err)
	}
	defer resp.Body.Close()

	if err := githubrelease.CheckAPIResponse(resp); err != nil {
		return ReleaseAssets{}, "", err
	}

	var release dto.GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return ReleaseAssets{}, "", fmt.Errorf("parsing release JSON: %w", err)
	}

	assets := make(map[string]string)
	for _, asset := range release.Assets {
		if private {
			assets[asset.Name] = asset.URL
		} else {
			assets[asset.Name] = asset.BrowserDownloadURL
		}
	}

	return ReleaseAssets{tag: release.TagName, fromMap: assets}, release.TagName, nil
}

// FetchManifestIndex fetches and parses the repo-wide manifest.json index
// asset from a release — the single source of truth for every plugin the
// release publishes. Returns an error if the asset is missing or fails to
// fetch/parse.
func FetchManifestIndex(ctx context.Context, assets ReleaseAssets, token string) (*dto.ManifestIndex, error) {
	url, ok := assets.Lookup(manifestIndexAssetName)
	if !ok {
		return nil, fmt.Errorf("%q not found in release", manifestIndexAssetName)
	}

	req, err := githubrelease.NewAssetRequest(ctx, url, token)
	if err != nil {
		return nil, fmt.Errorf("creating manifest index request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching manifest index: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("manifest index fetch returned status %d", resp.StatusCode)
	}

	var index dto.ManifestIndex
	if err := json.NewDecoder(resp.Body).Decode(&index); err != nil {
		return nil, fmt.Errorf("parsing manifest index JSON: %w", err)
	}

	return &index, nil
}

// DiscoverPluginIDs derives the set of plugin IDs published in a release from
// the manifest index's embedded manifests, so the marketplace never needs a
// hardcoded list of known plugins. Returned in sorted order for determinism.
func DiscoverPluginIDs(index *dto.ManifestIndex) []string {
	ids := make([]string, 0, len(index.Plugins))
	for _, entry := range index.Plugins {
		if entry.ID != "" && ValidPluginID(entry.ID) {
			ids = append(ids, entry.ID)
		}
	}
	slices.Sort(ids)
	return ids
}

// FetchManifest returns the plugin's manifest from the manifest index — the
// index embeds each plugin's complete manifest directly, so no further asset
// fetch is needed.
func FetchManifest(pluginID string, index *dto.ManifestIndex) (*dto.Manifest, error) {
	for i := range index.Plugins {
		if index.Plugins[i].ID == pluginID {
			manifest := index.Plugins[i]
			manifest.Version = NormalizeVersion(manifest.Version)
			return &manifest, nil
		}
	}
	return nil, fmt.Errorf("plugin %q not found in manifest index", pluginID)
}

// NormalizeVersion strips a leading "v"/"V" so versions from different sources
// (manifest.json's declared version, a GitHub release tag like "v0.15.4") can
// be compared and displayed consistently as bare "x.y.z" semver.
func NormalizeVersion(version string) string {
	if len(version) > 0 && (version[0] == 'v' || version[0] == 'V') {
		return version[1:]
	}
	return version
}

// ResolveAssetNames returns the binary and bundle asset names for the given platform.
// bundleAsset is now a tar.gz archive containing the complete dist/ directory
// (index.js + chunk-*.js files with content-hashed names).
func ResolveAssetNames(pluginID, goos, goarch string) (binaryAsset, bundleAsset string) {
	binaryAsset = fmt.Sprintf("galacius-plugin-%s-%s-%s", pluginID, goos, goarch)
	if goos == "windows" {
		binaryAsset += ".exe"
	}
	bundleAsset = fmt.Sprintf("galacius-plugin-%s-frontend.tar.gz", pluginID)
	return binaryAsset, bundleAsset
}

// ResolveLogoAssetName returns the GitHub release asset name for a plugin's
// logo file, derived from the local filename manifest.Assets.Logo declares
// (e.g. "helm.svg" -> "galacius-plugin-helm-logo.svg"). Mirrors the same
// galacius-plugin-<id>-<kind> naming convention as the binary/bundle/manifest
// assets, so the installer can look it up in the assets map FetchRelease returns.
func ResolveLogoAssetName(pluginID, logoFileName string) string {
	return fmt.Sprintf("galacius-plugin-%s-logo%s", pluginID, filepath.Ext(logoFileName))
}

// IsPlatformSupported checks if the manifest supports the given platform
func IsPlatformSupported(m *dto.Manifest, goos, goarch string) bool {
	if m.OS == nil {
		return false
	}
	archs, ok := m.OS[goos]
	if !ok {
		return false
	}
	return slices.Contains(archs, goarch)
}

// IsHostVersionCompatible checks if hostVersion falls within min and max version constraints.
// Development builds (hostVersion == config.Dev, the same value the frontend's About dialog
// displays via GetVersion()) always report compatible, since the version gate only makes
// sense for semver-tagged releases.
func IsHostVersionCompatible(hostVersion, minVersion, maxVersion string) (bool, error) {
	if hostVersion == config.Dev {
		return true, nil
	}

	hostVer, err := semver.NewVersion(hostVersion)
	if err != nil {
		return false, fmt.Errorf("parsing host version %q: %w", hostVersion, err)
	}

	minVer, err := semver.NewVersion(minVersion)
	if err != nil {
		return false, fmt.Errorf("parsing minimum version %q: %w", minVersion, err)
	}

	maxVer, err := semver.NewVersion(maxVersion)
	if err != nil {
		return false, fmt.Errorf("parsing maximum version %q: %w", maxVersion, err)
	}

	// Check if hostVer is within [minVer, maxVer]
	if hostVer.LessThan(minVer) || hostVer.GreaterThan(maxVer) {
		return false, nil
	}

	return true, nil
}

// DownloadToFile downloads a file from the given URL to destPath.
// Creates parent directories if needed and atomically writes via temp file.
// token is sent as a Bearer header (required for private-repo release assets).
// onProgress is an optional callback that receives progress updates as a percentage (0-100).
// If onProgress is nil or resp.ContentLength is unknown (<=0), no progress callbacks are made.
func DownloadToFile(ctx context.Context, url, destPath, token string, onProgress func(pct int)) error {
	return githubrelease.ToFile(ctx, url, destPath, token, onProgress)
}

// AssetBackup tracks an installed plugin's existing binary, dist directory,
// and metadata file after they've been moved aside by BackupPluginAssets, so
// a failed re-download can be rolled back via Restore, or the backup can be
// discarded via Discard once the new version installs successfully.
type AssetBackup struct {
	dir          string
	binaryPath   string
	distDir      string
	metadataPath string
	hadBinary    bool
	hadDist      bool
	hadMetadata  bool
}

// BackupPluginAssets moves a plugin's existing binary, dist directory, and
// metadata file into a temporary ".backup" directory before a new version is
// downloaded. Assets that don't exist yet (fresh install) are skipped, so the
// returned backup is a no-op for Restore/Discard.
func BackupPluginAssets(pluginDir, binaryPath, distDir, metadataPath string) (*AssetBackup, error) {
	backupDir := filepath.Join(pluginDir, ".backup")
	_ = os.RemoveAll(backupDir)

	b := &AssetBackup{
		dir:          backupDir,
		binaryPath:   binaryPath,
		distDir:      distDir,
		metadataPath: metadataPath,
	}

	moveAside := func(srcPath, backupName string) (moved bool, err error) {
		if _, statErr := os.Lstat(srcPath); statErr != nil {
			return false, nil
		}
		if err := os.MkdirAll(backupDir, 0755); err != nil {
			return false, fmt.Errorf("creating backup directory: %w", err)
		}
		if err := os.Rename(srcPath, filepath.Join(backupDir, backupName)); err != nil {
			return false, fmt.Errorf("backing up %q: %w", srcPath, err)
		}
		return true, nil
	}

	var err error
	if b.hadBinary, err = moveAside(binaryPath, filepath.Base(binaryPath)); err != nil {
		return nil, err
	}
	if b.hadDist, err = moveAside(distDir, "dist"); err != nil {
		return nil, err
	}
	if b.hadMetadata, err = moveAside(metadataPath, filepath.Base(metadataPath)); err != nil {
		return nil, err
	}

	return b, nil
}

// Restore moves backed-up assets back to their original locations, undoing
// BackupPluginAssets. Any partially-downloaded new assets at the destination
// are removed first so the restored (old) assets always win.
func (b *AssetBackup) Restore() error {
	moveBack := func(hadIt bool, backupName, destPath string, removeDest func(string) error) error {
		if !hadIt {
			return nil
		}
		_ = removeDest(destPath)
		if err := os.Rename(filepath.Join(b.dir, backupName), destPath); err != nil {
			return fmt.Errorf("restoring %q: %w", destPath, err)
		}
		return nil
	}

	if err := moveBack(b.hadBinary, filepath.Base(b.binaryPath), b.binaryPath, os.Remove); err != nil {
		return err
	}
	if err := moveBack(b.hadDist, "dist", b.distDir, os.RemoveAll); err != nil {
		return err
	}
	if err := moveBack(b.hadMetadata, filepath.Base(b.metadataPath), b.metadataPath, os.Remove); err != nil {
		return err
	}

	return os.RemoveAll(b.dir)
}

// Discard permanently deletes the backed-up assets after a successful
// install, since the previous version's files are no longer needed.
func (b *AssetBackup) Discard() error {
	if !b.hadBinary && !b.hadDist && !b.hadMetadata {
		return nil
	}
	return os.RemoveAll(b.dir)
}

// VerifySHA256 verifies that a file's SHA256 hash matches the expected hex string (case-insensitive)
func VerifySHA256(path, expectedHex string) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("opening file %q: %w", path, err)
	}
	defer f.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, f); err != nil {
		return fmt.Errorf("hashing file: %w", err)
	}

	actualHex := fmt.Sprintf("%x", hash.Sum(nil))
	if strings.EqualFold(actualHex, expectedHex) {
		return nil
	}

	return fmt.Errorf("SHA256 mismatch: expected %s, got %s", expectedHex, actualHex)
}

// ExtractTarGz extracts a gzip-compressed tar archive to destDir.
// Only regular files are extracted; directories, symlinks, and hard links are rejected
// for security. Zip-slip protection is mandatory: each entry's target path is verified
// to be within destDir via filepath.Rel — if relative path starts with "..", extraction fails.
func ExtractTarGz(archivePath, destDir string) error {
	// Open and decompress
	f, err := os.Open(archivePath)
	if err != nil {
		return fmt.Errorf("opening archive %q: %w", archivePath, err)
	}
	defer f.Close()

	gzr, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("decompressing gzip: %w", err)
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			// End of tar stream, normal completion
			break
		}
		if err != nil {
			return fmt.Errorf("reading tar: %w", err)
		}

		// Only extract regular files; reject everything else
		if hdr.Typeflag != tar.TypeReg {
			if hdr.Typeflag == tar.TypeSymlink || hdr.Typeflag == tar.TypeLink {
				return fmt.Errorf("rejecting symlink/hardlink in archive: %q", hdr.Name)
			}
			// Silently skip directories and other types
			continue
		}

		// Zip-slip protection: resolve target path and verify it's within destDir
		// BEFORE creating any directories or writing any files.
		targetPath := filepath.Join(destDir, hdr.Name)

		absDestDir, err := filepath.Abs(destDir)
		if err != nil {
			return fmt.Errorf("resolving dest directory: %w", err)
		}

		absTargetPath, err := filepath.Abs(targetPath)
		if err != nil {
			return fmt.Errorf("resolving target path for %q: %w", hdr.Name, err)
		}

		// Check if resolved target is within destDir
		relPath, err := filepath.Rel(absDestDir, absTargetPath)
		if err != nil || strings.HasPrefix(relPath, "..") {
			return fmt.Errorf("path traversal attack detected: %q would escape %q", hdr.Name, destDir)
		}

		// Only now that the path is confirmed safe, ensure parent directories exist
		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
			return fmt.Errorf("creating directory for %q: %w", targetPath, err)
		}

		// Extract file with 0644 permissions (non-executable)
		f, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
		if err != nil {
			return fmt.Errorf("creating file %q: %w", targetPath, err)
		}

		if _, err := io.Copy(f, tr); err != nil {
			f.Close()
			return fmt.Errorf("writing file %q: %w", targetPath, err)
		}

		if err := f.Close(); err != nil {
			return fmt.Errorf("closing file %q: %w", targetPath, err)
		}
	}

	return nil
}
