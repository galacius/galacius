package app

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/galacius/galacius/internal/plugin"
	"github.com/galacius/galacius/packages/core/kube/dto"
)

// TestRemovePluginNotInstalled verifies error when plugin is not installed
// (neither in loader map nor on disk)
func TestRemovePluginNotInstalled(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	err := app.RemovePlugin("unknown-plugin")
	if err == nil {
		t.Fatal("expected error when removing non-existent plugin, got nil")
	}
	if err.Error() != "plugin \"unknown-plugin\" is not installed" {
		t.Errorf("unexpected error message: %v", err)
	}
}

// TestRemovePluginInvalidID verifies error on path traversal attempts
func TestRemovePluginInvalidID(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	tests := []string{
		"../etc/passwd",
		"plugin/../../../etc",
		"plugin with spaces",
		"plugin@invalid",
	}

	for _, id := range tests {
		err := app.RemovePlugin(id)
		if err == nil {
			t.Errorf("expected error for invalid plugin ID %q, got nil", id)
		}
	}
}

// TestRemovePluginWhileInstalling verifies error when plugin is installing
func TestRemovePluginWhileInstalling(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	// Manually create a loader in INSTALLING state
	binaryPath := filepath.Join(tempHome, ".galacius", "plugins", "test-plugin", "plugin-test-plugin")
	loader := plugin.NewPluginLoader("test-plugin", binaryPath)
	loader.SetStatus(dto.PluginStatusInstalling)

	app.pluginsMu.Lock()
	app.pluginLoaders["test-plugin"] = loader
	app.pluginsMu.Unlock()

	err := app.RemovePlugin("test-plugin")
	if err == nil {
		t.Fatal("expected error when removing plugin during installation, got nil")
	}
	if err.Error() != "cannot remove plugin \"test-plugin\" while installation is in progress" {
		t.Errorf("unexpected error message: %v", err)
	}

	// Loader should still exist (not removed)
	app.pluginsMu.Lock()
	_, exists := app.pluginLoaders["test-plugin"]
	app.pluginsMu.Unlock()
	if !exists {
		t.Error("expected loader to still exist after failed removal")
	}
}

// TestRemovePluginSuccess verifies successful removal of installed plugin
func TestRemovePluginSuccess(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	// Create plugin directory with files
	pluginID := "test-plugin"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create some files to ensure directory deletion works
	binaryPath := filepath.Join(pluginDir, "plugin-test-plugin")
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	lockPath := filepath.Join(pluginDir, "test-plugin.lock")

	for _, path := range []string{binaryPath, metadataPath, lockPath} {
		if err := os.WriteFile(path, []byte("test"), 0644); err != nil {
			t.Fatalf("failed to create test file %s: %v", path, err)
		}
	}

	// Create loader in READY state
	loader := plugin.NewPluginLoader(pluginID, binaryPath)
	loader.SetStatus(dto.PluginStatusReady)

	app.pluginsMu.Lock()
	app.pluginLoaders[pluginID] = loader
	app.pluginsMu.Unlock()

	// Remove the plugin
	err := app.RemovePlugin(pluginID)
	if err != nil {
		t.Fatalf("expected no error when removing plugin, got: %v", err)
	}

	// Verify directory is deleted
	if _, err := os.Stat(pluginDir); err == nil {
		t.Error("expected plugin directory to be deleted, but it still exists")
	} else if !os.IsNotExist(err) {
		t.Errorf("unexpected error checking plugin directory: %v", err)
	}

	// Verify loader is removed from map
	app.pluginsMu.Lock()
	_, exists := app.pluginLoaders[pluginID]
	app.pluginsMu.Unlock()
	if exists {
		t.Error("expected loader to be removed from pluginLoaders map")
	}
}

// TestRemovePluginCrashed verifies removal works for crashed plugins too
func TestRemovePluginCrashed(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	pluginID := "crashed-plugin"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	binaryPath := filepath.Join(pluginDir, "plugin-crashed-plugin")
	if err := os.WriteFile(binaryPath, []byte("test"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// Create loader in CRASHED state
	loader := plugin.NewPluginLoader(pluginID, binaryPath)
	loader.SetStatusWithError(dto.PluginStatusCrashed, "test crash")

	app.pluginsMu.Lock()
	app.pluginLoaders[pluginID] = loader
	app.pluginsMu.Unlock()

	// Should succeed even though crashed
	err := app.RemovePlugin(pluginID)
	if err != nil {
		t.Fatalf("expected no error when removing crashed plugin, got: %v", err)
	}

	// Verify cleanup
	if _, err := os.Stat(pluginDir); err == nil {
		t.Error("expected plugin directory to be deleted")
	} else if !os.IsNotExist(err) {
		t.Errorf("unexpected error: %v", err)
	}

	app.pluginsMu.Lock()
	_, exists := app.pluginLoaders[pluginID]
	app.pluginsMu.Unlock()
	if exists {
		t.Error("expected loader to be removed")
	}
}

// TestRemovePluginStatusConvention verifies removal works for READY and CRASHED
func TestRemovePluginStatusConvention(t *testing.T) {
	tests := []struct {
		name   string
		status dto.PluginStatus
		ok     bool
	}{
		{"READY", dto.PluginStatusReady, true},
		{"CRASHED", dto.PluginStatusCrashed, true},
		{"INSTALLING", dto.PluginStatusInstalling, false},
		{"INCOMPATIBLE", dto.PluginStatusIncompatible, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tempHome := t.TempDir()
			t.Setenv("HOME", tempHome)
			t.Setenv("MARKETPLACE_ENABLED", "true")
			app := NewApp("test")

			pluginID := "test-plugin"
			pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
			if err := os.MkdirAll(pluginDir, 0755); err != nil {
				t.Fatalf("failed to create plugin directory: %v", err)
			}

			binaryPath := filepath.Join(pluginDir, "plugin-test-plugin")
			if err := os.WriteFile(binaryPath, []byte("test"), 0755); err != nil {
				t.Fatalf("failed to create binary: %v", err)
			}

			loader := plugin.NewPluginLoader(pluginID, binaryPath)
			loader.SetStatus(tt.status)

			app.pluginsMu.Lock()
			app.pluginLoaders[pluginID] = loader
			app.pluginsMu.Unlock()

			err := app.RemovePlugin(pluginID)

			if tt.ok && err != nil {
				t.Errorf("expected success for %s, got error: %v", tt.status, err)
			} else if !tt.ok && err == nil {
				t.Errorf("expected error for %s, got nil", tt.status)
			}
		})
	}
}

// TestRemovePluginOrphanedDirectory verifies that RemovePlugin can remove
// a plugin directory even when no loader exists in the map (orphaned directory case)
func TestRemovePluginOrphanedDirectory(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	pluginID := "orphaned-plugin"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create some files in the orphaned directory
	binaryPath := filepath.Join(pluginDir, "plugin-orphaned-plugin")
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	if err := os.WriteFile(binaryPath, []byte("test"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}
	if err := os.WriteFile(metadataPath, []byte("{}"), 0644); err != nil {
		t.Fatalf("failed to create metadata: %v", err)
	}

	// Verify directory exists
	if _, err := os.Stat(pluginDir); err != nil {
		t.Fatalf("plugin directory should exist before removal: %v", err)
	}

	// DO NOT add a loader to the map — this is the orphaned case
	// app.pluginLoaders[pluginID] is intentionally empty

	// Removal should succeed even though no loader exists in the map
	err := app.RemovePlugin(pluginID)
	if err != nil {
		t.Fatalf("expected no error when removing orphaned plugin directory, got: %v", err)
	}

	// Verify directory is deleted
	if _, err := os.Stat(pluginDir); err == nil {
		t.Error("expected orphaned plugin directory to be deleted, but it still exists")
	} else if !os.IsNotExist(err) {
		t.Errorf("unexpected error checking plugin directory: %v", err)
	}

	// Verify no loader was added to the map
	app.pluginsMu.Lock()
	_, exists := app.pluginLoaders[pluginID]
	app.pluginsMu.Unlock()
	if exists {
		t.Error("expected no loader to be in map after removing orphaned directory")
	}
}

// TestRemovePluginBlocksInstallDuringRemoval verifies that InstallPlugin is blocked
// if RemovePlugin is in progress on the same pluginID. We test this by checking
// that the removingPluginIDs flag blocks InstallPlugin.
func TestRemovePluginBlocksInstallDuringRemoval(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	pluginID := "concurrent-plugin"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create binary so removal can proceed
	binaryPath := filepath.Join(pluginDir, "plugin-concurrent-plugin")
	if err := os.WriteFile(binaryPath, []byte("test"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// Create a loader in READY state (not INSTALLING)
	loader := plugin.NewPluginLoader(pluginID, binaryPath)
	loader.SetStatus(dto.PluginStatusReady)

	app.pluginsMu.Lock()
	app.pluginLoaders[pluginID] = loader
	app.pluginsMu.Unlock()

	// Manually mark plugin as removing (simulating what RemovePlugin does)
	app.pluginsMu.Lock()
	app.removingPluginIDs[pluginID] = true
	app.pluginsMu.Unlock()

	// Now try to install — should fail because removal is marked as in progress
	installErr := app.InstallPlugin(pluginID, "", "")

	if installErr == nil {
		t.Error("expected InstallPlugin to fail when RemovePlugin is in progress")
	}
	if !strings.Contains(installErr.Error(), "removal is in progress") {
		t.Errorf("expected error about removal in progress, got: %v", installErr)
	}

	// Clean up
	app.pluginsMu.Lock()
	delete(app.removingPluginIDs, pluginID)
	app.pluginsMu.Unlock()
}

// TestInstallPluginConcurrentWithRemove verifies that InstallPlugin and RemovePlugin
// cannot race — setting installation status should block concurrent removals
func TestInstallPluginConcurrentWithRemove(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	pluginID := "install-then-remove"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create an empty binary path for the loader (file doesn't need to exist for this test)
	binaryPath := filepath.Join(pluginDir, "plugin-install-then-remove")

	// Do NOT create a loader initially — let InstallPlugin create one

	var removeErr error
	var wg sync.WaitGroup
	var installStarted atomic.Bool
	installHasSetStatus := make(chan struct{})

	// Goroutine 1: Try to remove while installation is happening
	wg.Add(1)
	go func() {
		defer wg.Done()
		for !installStarted.Load() {
			time.Sleep(1 * time.Millisecond)
		}
		<-installHasSetStatus

		// Now try to remove while installation is happening
		removeErr = app.RemovePlugin(pluginID)
	}()

	// Goroutine 2: Create loader and set it to INSTALLING
	wg.Add(1)
	go func() {
		defer wg.Done()

		// Create loader in INSTALLING state
		loader := plugin.NewPluginLoader(pluginID, binaryPath)
		loader.SetStatus(dto.PluginStatusInstalling)

		app.pluginsMu.Lock()
		app.pluginLoaders[pluginID] = loader
		app.pluginsMu.Unlock()

		installStarted.Store(true)
		close(installHasSetStatus)

		// Wait a bit for RemovePlugin to check and fail
		time.Sleep(50 * time.Millisecond)
	}()

	wg.Wait()

	// RemovePlugin should have failed because INSTALLING status blocks removal
	if removeErr == nil {
		t.Error("expected RemovePlugin to fail when plugin is INSTALLING")
	}
}

// TestRemovePluginNotInstalledDoesNotBlockFutureInstall verifies that attempting
// to remove a non-installed plugin doesn't accidentally block future installs
func TestRemovePluginNotInstalledDoesNotBlockFutureInstall(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")
	pluginID := "test-plugin"

	// Try to remove a plugin that doesn't exist (no directory, no loader)
	_ = app.RemovePlugin(pluginID)
	// Error or success is fine; we just check that a subsequent install isn't blocked

	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", pluginID)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Verify that removingPluginIDs doesn't accidentally keep the plugin marked as removing
	app.pluginsMu.Lock()
	isMarkedRemoving := app.removingPluginIDs[pluginID]
	app.pluginsMu.Unlock()

	if isMarkedRemoving {
		t.Error("expected removingPluginIDs to be cleaned up after RemovePlugin, but plugin still marked")
	}

	// Try to install — should not fail due to removal lock
	installErr := app.InstallPlugin(pluginID, "", "")
	if installErr != nil {
		t.Errorf("expected InstallPlugin to succeed after failed RemovePlugin on non-existent plugin, got: %v", installErr)
	}
}
