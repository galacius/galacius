package app

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/galacius/galacius/internal/config"
	"github.com/galacius/galacius/packages/core/kube/dto"
)

// TestRestoreInstalledPluginsDisabledState verifies that a disabled plugin is restored
// with DISABLED status rather than READY.
func TestRestoreInstalledPluginsDisabledState(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	pluginID := "helm"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	binaryName := "plugin-" + pluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, _ := json.Marshal(metadata)
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Pre-populate disabled state to mark this plugin as disabled BEFORE restoring
	app.mu.Lock()
	app.settings.PluginDisabledState = map[string]bool{
		pluginID: true,
	}
	app.mu.Unlock()

	// Restore plugins - should honor the pre-existing disabled state
	app.restoreInstalledPlugins()

	// Verify: loader should be marked DISABLED, not READY
	app.pluginsMu.RLock()
	loader, exists := app.pluginLoaders[pluginID]
	app.pluginsMu.RUnlock()

	if !exists {
		t.Errorf("expected loader for plugin ID %q to exist, but it does not", pluginID)
		return
	}

	if loader.Status() != dto.PluginStatusDisabled {
		t.Errorf("expected loader status to be DISABLED, got %s", loader.Status())
	}
}

// TestDisabledPluginStillReportsSize verifies that GetInstalledPlugin still
// computes on-disk size for a DISABLED plugin — its files remain on disk, so
// the size must keep showing in storage breakdowns (About modal) rather than
// silently disappearing once disabled.
func TestDisabledPluginStillReportsSize(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	pluginID := "helm"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	binaryName := "plugin-" + pluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("some-binary-content"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, _ := json.Marshal(metadata)
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	app.restoreInstalledPlugins()

	if err := app.DisablePlugin(pluginID); err != nil {
		t.Fatalf("DisablePlugin failed: %v", err)
	}

	info := app.GetInstalledPlugin(pluginID)
	if info.Status != dto.PluginStatusDisabled.String() {
		t.Fatalf("expected status DISABLED, got %s", info.Status)
	}
	if info.Size <= 0 {
		t.Errorf("expected disabled plugin to still report a positive on-disk size, got %d", info.Size)
	}
}

// TestRestoreInstalledPluginsReadyByDefault verifies that a plugin is restored
// as READY when no disabled state entry exists.
func TestRestoreInstalledPluginsReadyByDefault(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	pluginID := "helm"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	binaryName := "plugin-" + pluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, _ := json.Marshal(metadata)
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugins without any disabled state entry
	app.restoreInstalledPlugins()

	// Verify: loader should be marked READY by default
	app.pluginsMu.RLock()
	loader, exists := app.pluginLoaders[pluginID]
	app.pluginsMu.RUnlock()

	if !exists {
		t.Errorf("expected loader for plugin ID %q to exist, but it does not", pluginID)
		return
	}

	if loader.Status() != dto.PluginStatusReady {
		t.Errorf("expected loader status to be READY by default, got %s", loader.Status())
	}
}

// TestRemovePluginClearsDisabledState verifies that RemovePlugin also removes
// the plugin from the disabled state map and persists the change.
func TestRemovePluginClearsDisabledState(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")

	app := NewApp("test")

	pluginID := "helm"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	binaryName := "plugin-" + pluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, _ := json.Marshal(metadata)
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugin and mark as disabled
	app.mu.Lock()
	app.settings.PluginDisabledState = map[string]bool{
		pluginID: true,
	}
	app.mu.Unlock()
	app.restoreInstalledPlugins()

	// Remove the plugin
	err := app.RemovePlugin(pluginID)
	if err != nil {
		t.Fatalf("RemovePlugin failed: %v", err)
	}

	// Verify: settings should have disabled state cleared
	reloadedSettings, err := config.Load()
	if err != nil {
		t.Fatalf("failed to reload settings: %v", err)
	}
	if reloadedSettings.PluginDisabledState[pluginID] {
		t.Errorf("expected plugin to be removed from disabled state after RemovePlugin, but it remains")
	}
}

// TestGetPluginBackendAddrRejectsDisabled verifies that GetPluginBackendAddr
// returns an error if the plugin is disabled.
func TestGetPluginBackendAddrRejectsDisabled(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")

	app := NewApp("test")

	pluginID := "helm"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	binaryName := "plugin-" + pluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, _ := json.Marshal(metadata)
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugin with disabled state
	app.mu.Lock()
	app.settings.PluginDisabledState = map[string]bool{
		pluginID: true,
	}
	app.mu.Unlock()

	app.restoreInstalledPlugins()

	// Try to get backend address for disabled plugin
	_, err := app.GetPluginBackendAddr(pluginID)
	if err == nil {
		t.Errorf("expected GetPluginBackendAddr to return an error for disabled plugin, but got nil")
	}
}

// TestDisablePlugin verifies that DisablePlugin successfully disables a plugin,
// persists the state, and changes status to DISABLED.
func TestDisablePlugin(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")

	app := NewApp("test")

	pluginID := "helm"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	binaryName := "plugin-" + pluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, _ := json.Marshal(metadata)
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugin as READY
	app.restoreInstalledPlugins()

	app.pluginsMu.RLock()
	loader, exists := app.pluginLoaders[pluginID]
	app.pluginsMu.RUnlock()
	if !exists || loader.Status() != dto.PluginStatusReady {
		t.Fatalf("expected plugin to be READY after restore, got %v", loader.Status())
	}

	// Disable the plugin (ctx is nil in test, so EventsEmit will be skipped)
	err := app.DisablePlugin(pluginID)
	if err != nil {
		t.Fatalf("DisablePlugin failed: %v", err)
	}

	// Verify: status should be DISABLED
	app.pluginsMu.RLock()
	statusAfterDisable := loader.Status()
	app.pluginsMu.RUnlock()
	if statusAfterDisable != dto.PluginStatusDisabled {
		t.Errorf("expected status DISABLED after DisablePlugin, got %s", statusAfterDisable)
	}

	// Verify: disabled state should be persisted
	reloadedSettings, err := config.Load()
	if err != nil {
		t.Fatalf("failed to reload settings: %v", err)
	}
	if !reloadedSettings.PluginDisabledState[pluginID] {
		t.Errorf("expected plugin to be marked disabled in persisted settings, but it was not")
	}
}

// TestEnablePlugin verifies that EnablePlugin successfully enables a plugin,
// persists the state, and changes status to READY.
func TestEnablePlugin(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("mock plugin binary is a bash script; not runnable on windows")
	}
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")

	app := NewApp("test")

	pluginID := "helm"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	binaryName := "plugin-" + pluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	// A real (script) executable, not just a placeholder file: EnablePlugin now
	// launches the plugin app-wide regardless of active context, so the binary
	// must actually run and print a valid READY handshake for the test to reach
	// the READY status it asserts.
	mockScript := "#!/bin/bash\necho '{\"type\":\"READY\",\"version\":\"test\",\"httpPort\":19999}'\nsleep 3600\n"
	if err := os.WriteFile(binaryPath, []byte(mockScript), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, _ := json.Marshal(metadata)
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugin as disabled
	app.mu.Lock()
	app.settings.PluginDisabledState = map[string]bool{
		pluginID: true,
	}
	app.mu.Unlock()
	app.restoreInstalledPlugins()

	app.pluginsMu.RLock()
	loader, exists := app.pluginLoaders[pluginID]
	app.pluginsMu.RUnlock()
	if !exists || loader.Status() != dto.PluginStatusDisabled {
		t.Fatalf("expected plugin to be DISABLED after restore, got %v", loader.Status())
	}

	// Enable the plugin (ctx is nil in test, so EventsEmit will be skipped; the
	// plugin launches app-wide even with no active context)
	err := app.EnablePlugin(pluginID)
	if err != nil {
		t.Fatalf("EnablePlugin failed: %v", err)
	}

	// Verify: status should be READY
	app.pluginsMu.RLock()
	statusAfterEnable := loader.Status()
	app.pluginsMu.RUnlock()
	if statusAfterEnable != dto.PluginStatusReady {
		t.Errorf("expected status READY after EnablePlugin, got %s", statusAfterEnable)
	}

	// Verify: disabled state should be removed from persisted settings
	reloadedSettings, err := config.Load()
	if err != nil {
		t.Fatalf("failed to reload settings: %v", err)
	}
	if reloadedSettings.PluginDisabledState[pluginID] {
		t.Errorf("expected plugin to be removed from disabled state in persisted settings, but it remains")
	}
}

// TestEnablePluginWithoutActiveContextStillLaunches verifies that EnablePlugin
// launches the plugin app-wide even with no active cluster context, and doesn't
// fail the enable operation.
func TestEnablePluginWithoutActiveContextStillLaunches(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("mock plugin binary is a bash script; not runnable on windows")
	}
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")

	app := NewApp("test")

	pluginID := "helm"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	binaryName := "plugin-" + pluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	// A real (script) executable: EnablePlugin now launches the plugin
	// unconditionally, so it must actually run and print a valid READY handshake.
	mockScript := "#!/bin/bash\necho '{\"type\":\"READY\",\"version\":\"test\",\"httpPort\":19999}'\nsleep 3600\n"
	if err := os.WriteFile(binaryPath, []byte(mockScript), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, _ := json.Marshal(metadata)
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugin as disabled
	app.mu.Lock()
	app.settings.PluginDisabledState = map[string]bool{
		pluginID: true,
	}
	// Ensure no active context is set
	app.activeContext = ""
	app.mu.Unlock()
	app.restoreInstalledPlugins()

	// Enable without active context - should not error, and should still launch
	err := app.EnablePlugin(pluginID)
	if err != nil {
		t.Errorf("EnablePlugin should not error without active context, but got: %v", err)
	}

	// Verify status is READY (launch succeeded even with no active context)
	app.pluginsMu.RLock()
	statusAfterEnable := app.pluginLoaders[pluginID].Status()
	app.pluginsMu.RUnlock()
	if statusAfterEnable != dto.PluginStatusReady {
		t.Errorf("expected status READY after EnablePlugin without context, got %s", statusAfterEnable)
	}
}

// TestDisablePluginAfterShutdownStateReset verifies regression:
// DisablePlugin should correctly set status to DISABLED even after the new Shutdown()
// state reset that sets status to NOT_INSTALLED. The explicit SetStatus(DISABLED)
// call in DisablePlugin must override the state reset and land correctly.
func TestDisablePluginAfterShutdownStateReset(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	pluginID := "helm"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	binaryName := "plugin-" + pluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, _ := json.Marshal(metadata)
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugin as READY
	app.mu.Lock()
	app.settings.PluginDisabledState = map[string]bool{}
	app.activeContext = ""
	app.mu.Unlock()
	app.restoreInstalledPlugins()

	// Verify plugin is in READY state
	app.pluginsMu.RLock()
	loader, exists := app.pluginLoaders[pluginID]
	app.pluginsMu.RUnlock()
	if !exists || loader == nil {
		t.Fatalf("expected plugin loader to be restored")
	}
	if loader.Status() != dto.PluginStatusReady {
		t.Errorf("expected initial status READY, got %s", loader.Status())
	}

	// Disable the plugin (this calls Shutdown() internally, which now resets state to NOT_INSTALLED)
	err := app.DisablePlugin(pluginID)
	if err != nil {
		t.Errorf("DisablePlugin should not error, but got: %v", err)
	}

	// Verify that despite the Shutdown state reset, the loader status is now DISABLED
	// (the explicit SetStatus(DISABLED) call in DisablePlugin must have landed correctly)
	app.pluginsMu.RLock()
	statusAfterDisable := app.pluginLoaders[pluginID].Status()
	app.pluginsMu.RUnlock()
	if statusAfterDisable != dto.PluginStatusDisabled {
		t.Errorf("expected status DISABLED after DisablePlugin, got %s", statusAfterDisable)
	}
}
