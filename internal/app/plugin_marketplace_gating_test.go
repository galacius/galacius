package app

import (
	"os"
	"testing"
)

// TestInstallPluginGatedWhenMarketplaceDisabled verifies that InstallPlugin
// returns an error when MARKETPLACE_ENABLED=false.
func TestInstallPluginGatedWhenMarketplaceDisabled(t *testing.T) {
	t.Setenv("MARKETPLACE_ENABLED", "false")

	app := NewApp("test")
	err := app.InstallPlugin("test-plugin", "", "")

	if err == nil {
		t.Fatal("expected error when marketplace is disabled, got nil")
	}

	if err.Error() != "marketplace feature is disabled" {
		t.Errorf("expected 'marketplace feature is disabled', got %v", err)
	}
}

// TestInstallPluginAllowedWhenMarketplaceEnabled verifies that InstallPlugin
// passes the gate when MARKETPLACE_ENABLED=true (the default).
func TestInstallPluginAllowedWhenMarketplaceEnabled(t *testing.T) {
	t.Setenv("MARKETPLACE_ENABLED", "true")

	app := NewApp("test")
	err := app.InstallPlugin("test-plugin", "", "")

	// Should NOT error on the marketplace gating check.
	// It may fail later (e.g. during fetch), but the gating should pass.
	// Since we're not mocking the HTTP server, we expect a different error,
	// but NOT the "marketplace feature is disabled" error.
	if err != nil && err.Error() == "marketplace feature is disabled" {
		t.Errorf("expected marketplace gate to allow install, got: %v", err)
	}
}

// TestRemovePluginGatedWhenMarketplaceDisabled verifies that RemovePlugin
// returns an error when MARKETPLACE_ENABLED=false.
func TestRemovePluginGatedWhenMarketplaceDisabled(t *testing.T) {
	t.Setenv("MARKETPLACE_ENABLED", "false")

	app := NewApp("test")
	err := app.RemovePlugin("test-plugin")

	if err == nil {
		t.Fatal("expected error when marketplace is disabled, got nil")
	}

	if err.Error() != "marketplace feature is disabled" {
		t.Errorf("expected 'marketplace feature is disabled', got %v", err)
	}
}

// TestRemovePluginAllowedWhenMarketplaceEnabled verifies that RemovePlugin
// passes the gate when MARKETPLACE_ENABLED=true (the default).
func TestRemovePluginAllowedWhenMarketplaceEnabled(t *testing.T) {
	t.Setenv("MARKETPLACE_ENABLED", "true")

	app := NewApp("test")
	err := app.RemovePlugin("test-plugin")

	// Should NOT error on the marketplace gating check.
	// It will fail because the plugin is not installed, but NOT on the gating.
	if err != nil && err.Error() == "marketplace feature is disabled" {
		t.Errorf("expected marketplace gate to allow remove, got: %v", err)
	}
}

// TestGetPluginsFromMarketplaceGatedWhenDisabled verifies that GetPluginsFromMarketplace
// returns an error dict when MARKETPLACE_ENABLED=false.
func TestGetPluginsFromMarketplaceGatedWhenDisabled(t *testing.T) {
	t.Setenv("MARKETPLACE_ENABLED", "false")

	app := NewApp("test")
	result := app.GetPluginsFromMarketplace()

	if result == nil {
		t.Fatal("expected non-nil MarketplaceResult")
	}

	if result.Errors == nil {
		t.Fatal("expected Errors map to be populated")
	}

	errMsg, hasErr := result.Errors["marketplace"]
	if !hasErr {
		t.Errorf("expected 'marketplace' key in Errors, got keys: %v", result.Errors)
	}

	if errMsg != "marketplace feature is disabled" {
		t.Errorf("expected error message 'marketplace feature is disabled', got %q", errMsg)
	}
}

// TestGetPluginsFromMarketplaceAllowedWhenEnabled verifies that GetPluginsFromMarketplace
// passes the gate when MARKETPLACE_ENABLED=true (the default).
func TestGetPluginsFromMarketplaceAllowedWhenEnabled(t *testing.T) {
	t.Setenv("MARKETPLACE_ENABLED", "true")

	app := NewApp("test")
	result := app.GetPluginsFromMarketplace()

	if result == nil {
		t.Fatal("expected non-nil MarketplaceResult")
	}

	// Should NOT have the marketplace disabled error.
	// It may have other errors (e.g., network), but NOT the disabled message.
	if errMsg, hasErr := result.Errors["marketplace"]; hasErr && errMsg == "marketplace feature is disabled" {
		t.Errorf("expected marketplace gate to allow fetch, got: %v", errMsg)
	}
}

// TestIsMarketplaceEnabledBoundMethod verifies the new bound method
// correctly reflects the config setting.
func TestIsMarketplaceEnabledBoundMethod(t *testing.T) {
	t.Run("returns true by default", func(t *testing.T) {
		t.Setenv("MARKETPLACE_ENABLED", "")
		os.Unsetenv("MARKETPLACE_ENABLED")

		app := NewApp("test")
		if !app.IsMarketplaceEnabled() {
			t.Error("expected IsMarketplaceEnabled to return true by default")
		}
	})

	t.Run("returns false when disabled", func(t *testing.T) {
		t.Setenv("MARKETPLACE_ENABLED", "false")
		app := NewApp("test")
		if app.IsMarketplaceEnabled() {
			t.Error("expected IsMarketplaceEnabled to return false when MARKETPLACE_ENABLED=false")
		}
	})
}
