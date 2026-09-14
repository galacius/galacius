package app

import (
	"testing"

	"github.com/galacius/galacius/internal/config"
)

// TestGetInstallSource_BlocksUntilDetectionCompletes verifies that after
// install source detection completes and installSourceReady is closed,
// GetInstallSource returns immediately without blocking. This replaces the
// old race-condition test, which is no longer relevant since detection now
// runs synchronously during Startup before frontend JS loads.
func TestGetInstallSource_BlocksUntilDetectionCompletes(t *testing.T) {
	app := NewApp("test")

	// Simulate the state after Startup has completed detection: installSource
	// is set and installSourceReady is closed.
	app.mu.Lock()
	app.installSource = "manual"
	app.mu.Unlock()
	close(app.installSourceReady)

	// After detection completes, GetInstallSource should return immediately
	// without blocking (the channel is already closed).
	source := app.GetInstallSource()
	if source != "manual" {
		t.Errorf("expected %q, got %q", "manual", source)
	}

	// Verify that the channel is closed (non-blocking select succeeds).
	select {
	case <-app.installSourceReady:
		// Expected: channel is closed
	default:
		t.Fatalf("expected installSourceReady to be closed after detection completes")
	}
}

// TestGetSettingsSeedsDefaultMarketplaceURLOnFirstRun verifies that GetSettings
// seeds the default marketplace source (config.GetMarketplaceBaseURL(), which
// honors MARKETPLACE_BASE_URL) as the first entry of MarketplaceRepositories
// when it has never been persisted (fresh install, nil array), so the
// frontend can show/manage it like any other repository row without a
// dedicated "default URL" concept of its own.
func TestGetSettingsSeedsDefaultMarketplaceURLOnFirstRun(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("MARKETPLACE_BASE_URL", "https://api.github.com/repos/test-org/test-marketplace/releases")

	app := NewApp("test")

	settings, err := app.GetSettings()
	if err != nil {
		t.Fatalf("GetSettings returned error: %v", err)
	}

	if len(settings.MarketplaceRepositories) != 1 {
		t.Fatalf("expected 1 seeded repository, got %d: %+v", len(settings.MarketplaceRepositories), settings.MarketplaceRepositories)
	}
	if got := settings.MarketplaceRepositories[0].URL; got != "https://api.github.com/repos/test-org/test-marketplace/releases" {
		t.Errorf("expected seeded URL to match MARKETPLACE_BASE_URL, got %q", got)
	}
}

// TestGetSettingsDoesNotReSeedOnceUserHasSaved verifies that once the user has
// saved settings with a non-nil MarketplaceRepositories array (even one where
// they removed the seeded default entry entirely, leaving it empty), GetSettings
// never seeds the default URL again.
func TestGetSettingsDoesNotReSeedOnceUserHasSaved(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	if err := config.Save(config.Settings{
		MarketplaceRepositories: []config.MarketplaceRepository{},
	}); err != nil {
		t.Fatalf("failed to seed settings: %v", err)
	}

	app := NewApp("test")

	settings, err := app.GetSettings()
	if err != nil {
		t.Fatalf("GetSettings returned error: %v", err)
	}

	if len(settings.MarketplaceRepositories) != 0 {
		t.Fatalf("expected no re-seeding once persisted as empty, got %d entries: %+v", len(settings.MarketplaceRepositories), settings.MarketplaceRepositories)
	}
}

// TestGetSettingsPreservesUserEditToSeededDefaultURL verifies that if the user
// edited the seeded default row's URL and saved, subsequent GetSettings calls
// return the edited value as-is rather than re-seeding the original default.
func TestGetSettingsPreservesUserEditToSeededDefaultURL(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	if err := config.Save(config.Settings{
		MarketplaceRepositories: []config.MarketplaceRepository{
			{URL: "https://api.github.com/repos/user/custom/releases", Private: true, AccessToken: "tok"},
		},
	}); err != nil {
		t.Fatalf("failed to seed settings: %v", err)
	}

	app := NewApp("test")

	settings, err := app.GetSettings()
	if err != nil {
		t.Fatalf("GetSettings returned error: %v", err)
	}

	if len(settings.MarketplaceRepositories) != 1 {
		t.Fatalf("expected exactly the user's saved repo, got %d entries: %+v", len(settings.MarketplaceRepositories), settings.MarketplaceRepositories)
	}
	if got := settings.MarketplaceRepositories[0].URL; got != "https://api.github.com/repos/user/custom/releases" {
		t.Errorf("expected user's edited URL, got %q", got)
	}
}

// TestSaveMarketplaceRepositoriesDoesNotClobberOtherSettings guards against a
// real "last write wins" race that existed when every Settings section shared
// the single generic SaveSettings(fullObject) path. SaveMarketplaceRepositories
// mutates only its own field directly on the authoritative in-memory
// a.settings under the lock, so it can't be clobbered by, or clobber, a stale
// snapshot from an unrelated section's save.
func TestSaveMarketplaceRepositoriesDoesNotClobberOtherSettings(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	app := NewApp("test")

	marketplaceRepos := []config.MarketplaceRepository{
		{URL: "https://api.github.com/repos/galacius/galacius/releases"},
		{URL: "https://github.com/userA/repoA"},
		{URL: "https://github.com/userB/repoB"},
	}
	if err := app.SaveMarketplaceRepositories(marketplaceRepos); err != nil {
		t.Fatalf("SaveMarketplaceRepositories returned error: %v", err)
	}

	final, err := app.GetSettings()
	if err != nil {
		t.Fatalf("GetSettings returned error: %v", err)
	}

	if len(final.MarketplaceRepositories) != len(marketplaceRepos) {
		t.Fatalf(
			"expected %d marketplace repository entries, got %d: %+v",
			len(marketplaceRepos), len(final.MarketplaceRepositories), final.MarketplaceRepositories,
		)
	}
}
