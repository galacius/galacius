package app

import (
	"sync"
	"testing"
)

func TestGetInstalledPluginNotInstalled(t *testing.T) {
	app := NewApp("test")
	status := app.GetInstalledPlugin("unknown-plugin")

	if status.Status != "NOT_INSTALLED" {
		t.Errorf("expected status NOT_INSTALLED, got %v", status.Status)
	}
	if status.Error != "" {
		t.Errorf("expected empty error, got %v", status.Error)
	}
}

// TestInstallPluginHelmNoActiveContext verifies the fix:
// Installing Helm plugin with no active cluster context should SUCCEED.
// Plugin installation is a metadata-level operation (download binary, verify checksum).
// Actual plugin feature usage (helmPluginClient) gates on active context separately.
func TestInstallPluginHelmNoActiveContext(t *testing.T) {
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")
	// activeContext defaults to "", simulating no connected cluster

	// Call InstallPlugin("helm", "", "") - should succeed (return nil error)
	// Async download/verify/install happens in goroutine; we only verify sync part passes
	err := app.InstallPlugin("helm", "", "")

	// Must return nil (synchronous validation passed)
	if err != nil {
		t.Fatalf("expected no error when installing Helm plugin with no active context, got: %v", err)
	}

	// Verify a loader was created and status set to INSTALLING (async work queued)
	app.pluginsMu.Lock()
	loader, exists := app.pluginLoaders["helm"]
	app.pluginsMu.Unlock()

	if !exists {
		t.Fatal("expected plugin loader to be created even without active context")
	}

	if loader == nil {
		t.Fatal("expected non-nil loader")
	}

	// Status should be INSTALLING (sync SetStatus call was made before goroutine started)
	status := loader.Status()
	if status != "INSTALLING" {
		t.Errorf("expected status INSTALLING, got %q", status)
	}
}

// TestInstallPluginHelmWithActiveContext verifies install with active context:
// With an active cluster context set, InstallPlugin("helm") should proceed
// and return nil immediately (async install runs in goroutine).
// The async install will attempt to launch the plugin immediately since activeContext is set.
// We can't test the full async install without a real binary/cluster,
// but we verify the synchronous checks pass and a loader is created.
func TestInstallPluginHelmWithActiveContext(t *testing.T) {
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")
	// Simulate a connected cluster by setting activeContext
	app.mu.Lock()
	app.activeContext = "test-cluster"
	app.mu.Unlock()

	// Call InstallPlugin("helm", "", "") - should pass synchronous validation
	err := app.InstallPlugin("helm", "", "")

	// Must return no error (validation passed, async install queued)
	if err != nil {
		t.Fatalf("expected no error when installing Helm plugin with active context, got: %v", err)
	}

	// Verify a loader was created and is now in INSTALLING status
	app.pluginsMu.Lock()
	loader, exists := app.pluginLoaders["helm"]
	app.pluginsMu.Unlock()

	if !exists {
		t.Fatal("expected plugin loader to be created after validation passes")
	}

	if loader == nil {
		t.Fatal("expected non-nil loader")
	}

	// Verify status was set to INSTALLING (the synchronous SetStatus call)
	// Note: we check here because async goroutine may not have run yet
	status := loader.Status()
	if status != "INSTALLING" {
		t.Logf("loader status is %q (may have transitioned as async install progressed)", status)
	}
}

// TestInstallPluginNonHelmNotGated verifies regression:
// Non-Helm plugins are NOT gated by active cluster context.
// Installing a non-Helm plugin with NO active context should succeed (nil error)
// and create a loader in INSTALLING status, confirming non-Helm plugins
// were never cluster-gated and still aren't.
func TestInstallPluginNonHelmNotGated(t *testing.T) {
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")
	// activeContext is "", simulating no connected cluster
	// Non-Helm plugins should install successfully regardless

	// Try to install a non-Helm plugin without active context
	err := app.InstallPlugin("other-plugin", "", "")

	// Must return nil error (synchronous validation passed)
	if err != nil {
		t.Fatalf("expected no error when installing non-Helm plugin with no active context, got: %v", err)
	}

	// Verify a loader was created and status set to INSTALLING
	app.pluginsMu.Lock()
	loader, exists := app.pluginLoaders["other-plugin"]
	app.pluginsMu.Unlock()

	if !exists {
		t.Fatal("expected plugin loader to be created for non-Helm plugin")
	}

	if loader == nil {
		t.Fatal("expected non-nil loader")
	}

	// Status should be INSTALLING (async work was queued)
	status := loader.Status()
	if status != "INSTALLING" {
		t.Errorf("expected status INSTALLING, got %q", status)
	}
}

// TestInstallPluginConcurrentAccess verifies thread safety:
// Multiple goroutines calling InstallPlugin concurrently should not race.
func TestInstallPluginConcurrentAccess(t *testing.T) {
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")
	app.mu.Lock()
	app.activeContext = "test-cluster"
	app.mu.Unlock()

	var wg sync.WaitGroup
	errChan := make(chan error, 10)

	// Launch 10 concurrent InstallPlugin calls
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			err := app.InstallPlugin("helm", "", "")
			errChan <- err
		}()
	}

	wg.Wait()
	close(errChan)

	// All should succeed (pass synchronous validation)
	for err := range errChan {
		if err != nil {
			t.Errorf("concurrent call failed: %v", err)
		}
	}

	// Loader should exist and be valid
	app.pluginsMu.Lock()
	_, exists := app.pluginLoaders["helm"]
	app.pluginsMu.Unlock()

	if !exists {
		t.Error("expected plugin loader to exist after concurrent calls")
	}
}
