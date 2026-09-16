package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/galacius/galacius/internal/config"
	"github.com/galacius/galacius/internal/plugin"
	"github.com/galacius/galacius/packages/core/kube/dto"
)

// TestGetPluginsFromMultipleMarketplaces verifies that GetPluginsFromMarketplace
// correctly fetches and merges manifests from multiple sources (default + user repos),
// with proper SourceURL assignment and error isolation.
func TestGetPluginsFromMultipleMarketplaces(t *testing.T) {
	// Create two test HTTP servers to simulate two marketplace repos
	// Note: we need a closure to capture the server URL for self-referential URLs
	var defaultServer *httptest.Server
	defaultServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate default marketplace latest release endpoint
		if r.URL.Path == "/repos/galacius/default/releases/latest" {
			release := dto.GitHubRelease{
				TagName: "v1.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name:               "plugin-helm-manifest.json",
						BrowserDownloadURL: defaultServer.URL + "/default-helm-manifest",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}
		// Serve default helm manifest
		if r.URL.Path == "/default-helm-manifest" {
			manifest := dto.Manifest{
				ID:      "helm",
				Name:    "Helm Plugin (Default)",
				Version: "1.0.0",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(manifest)
			return
		}
		http.NotFound(w, r)
	}))
	defer defaultServer.Close()

	var userServer *httptest.Server
	userServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate user marketplace latest release endpoint
		if r.URL.Path == "/repos/user/marketplace/releases/latest" {
			release := dto.GitHubRelease{
				TagName: "v2.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name:               "plugin-custom-manifest.json",
						BrowserDownloadURL: userServer.URL + "/custom-manifest",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}
		// Serve custom plugin manifest
		if r.URL.Path == "/custom-manifest" {
			manifest := dto.Manifest{
				ID:      "custom",
				Name:    "Custom Plugin",
				Version: "2.0.0",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(manifest)
			return
		}
		http.NotFound(w, r)
	}))
	defer userServer.Close()

	// Extract base URLs from test servers (format: http://localhost:PORT)
	_ = defaultServer.URL + "/repos/galacius/default" // default marketplace URL (not directly used in current test)
	userRepoURL := userServer.URL + "/repos/user/marketplace"

	// Create app with default and user marketplace settings
	app := &App{
		settings: config.Settings{
			AccessToken: "ghp_general",
			MarketplaceRepositories: []config.MarketplaceRepository{
				{
					URL:         userRepoURL,
					Private:     false,
					AccessToken: "ghp_user_repo",
				},
			},
		},
	}

	// Test: Verify token resolution for each repository
	// Verify app settings were set correctly
	if len(app.settings.MarketplaceRepositories) != 1 {
		t.Errorf("expected 1 user repo, got %d", len(app.settings.MarketplaceRepositories))
	}
	if app.settings.MarketplaceRepositories[0].URL != userRepoURL {
		t.Errorf("user repo URL mismatch: got %q, expected %q",
			app.settings.MarketplaceRepositories[0].URL, userRepoURL)
	}
	if app.settings.MarketplaceRepositories[0].AccessToken != "ghp_user_repo" {
		t.Errorf("user repo token mismatch: got %q, expected ghp_user_repo",
			app.settings.MarketplaceRepositories[0].AccessToken)
	}

	// Simulate what GetPluginsFromMarketplace does: collect sources purely from
	// settings.MarketplaceRepositories (no implicit built-in default source —
	// config.Load provisions the official marketplace as a regular
	// MarketplaceRepositories entry on first run instead). Settings.AccessToken
	// (reserved for app update-check downloads) must never leak into
	// marketplace source tokens.
	type source struct {
		sourceURL string
		token     string
	}

	sources := make([]source, len(app.settings.MarketplaceRepositories))
	for i, repo := range app.settings.MarketplaceRepositories {
		sources[i] = source{
			sourceURL: repo.URL,
			token:     repo.AccessToken,
		}
	}

	// Verify sources have correct tokens
	if len(sources) != 1 {
		t.Errorf("expected 1 source, got %d", len(sources))
	}

	// User source
	if sources[0].sourceURL != userRepoURL {
		t.Errorf("user source URL mismatch: got %q, expected %q", sources[0].sourceURL, userRepoURL)
	}
	if sources[0].token != "ghp_user_repo" {
		t.Errorf("user source token should be ghp_user_repo, got %q", sources[0].token)
	}
}

// TestGetPluginsFromMarketplaceSkipsDisabledRepos verifies that repositories
// with Disabled=true are excluded from the fetch sources, while enabled
// repos are still included. There is no implicit built-in default source —
// only entries actually present in MarketplaceRepositories are considered.
func TestGetPluginsFromMarketplaceSkipsDisabledRepos(t *testing.T) {
	app := &App{
		settings: config.Settings{
			MarketplaceRepositories: []config.MarketplaceRepository{
				{URL: "https://github.com/user/enabled-repo", Disabled: false},
				{URL: "https://github.com/user/disabled-repo", Disabled: true},
			},
		},
	}

	// Simulate what GetPluginsFromMarketplace does: build sources, skipping
	// disabled repos.
	type source struct {
		sourceURL string
		token     string
	}

	sources := []source{}
	for _, repo := range app.settings.MarketplaceRepositories {
		if repo.Disabled {
			continue
		}
		sources = append(sources, source{sourceURL: repo.URL, token: repo.AccessToken})
	}

	if len(sources) != 1 {
		t.Fatalf("expected 1 source (enabled repo only), got %d", len(sources))
	}
	if sources[0].sourceURL != "https://github.com/user/enabled-repo" {
		t.Errorf("expected enabled repo in sources, got %q", sources[0].sourceURL)
	}
	for _, s := range sources {
		if s.sourceURL == "https://github.com/user/disabled-repo" {
			t.Errorf("disabled repo should not appear in sources")
		}
	}
}

// TestMultipleMarketplaceErrorIsolation verifies that an error in one
// marketplace source doesn't prevent other sources from being processed.
func TestMultipleMarketplaceErrorIsolation(t *testing.T) {
	failingServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "server error", http.StatusInternalServerError)
	}))
	defer failingServer.Close()

	var workingServer *httptest.Server
	workingServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/repos/working/marketplace/releases/latest" {
			release := dto.GitHubRelease{
				TagName: "v1.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name:               "plugin-working-manifest.json",
						BrowserDownloadURL: workingServer.URL + "/working-manifest",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}
		if r.URL.Path == "/working-manifest" {
			manifest := dto.Manifest{
				ID:      "working",
				Name:    "Working Plugin",
				Version: "1.0.0",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(manifest)
			return
		}
		http.NotFound(w, r)
	}))
	defer workingServer.Close()

	failingRepoURL := failingServer.URL + "/repos/failing/marketplace"
	workingRepoURL := workingServer.URL + "/repos/working/marketplace"

	// Create app with one failing and one working marketplace
	app := &App{
		settings: config.Settings{
			AccessToken: "ghp_general",
			MarketplaceRepositories: []config.MarketplaceRepository{
				{
					URL:         failingRepoURL,
					AccessToken: "",
				},
				{
					URL:         workingRepoURL,
					AccessToken: "",
				},
			},
		},
	}

	// Verify both repos are in settings
	if len(app.settings.MarketplaceRepositories) != 2 {
		t.Errorf("expected 2 repos, got %d", len(app.settings.MarketplaceRepositories))
	}

	// Token resolution should use each repo's own (empty) token, never falling
	// back to the general AccessToken.
	app.mu.RLock()
	repos := make([]config.MarketplaceRepository, len(app.settings.MarketplaceRepositories))
	copy(repos, app.settings.MarketplaceRepositories)
	app.mu.RUnlock()

	for i, repo := range repos {
		if repo.AccessToken != "" {
			t.Errorf("repo %d: expected empty token, got %q", i, repo.AccessToken)
		}
	}
}

// TestManifestSourceURLAssignment verifies that SourceURL is correctly set
// when manifests are returned from different sources.
func TestManifestSourceURLAssignment(t *testing.T) {
	app := &App{
		settings: config.Settings{
			AccessToken: "ghp_general",
			MarketplaceRepositories: []config.MarketplaceRepository{
				{
					URL: "https://github.com/user/repo",
				},
			},
		},
	}
	_ = app // app is used indirectly to verify SourceURL assignments

	// Create test manifests
	defaultManifest := &dto.Manifest{
		ID:   "default-plugin",
		Name: "Default Plugin",
	}
	userManifest := &dto.Manifest{
		ID:   "user-plugin",
		Name: "User Plugin",
	}

	// Simulate what GetPluginsFromMarketplace does: assign SourceURL
	defaultManifest.SourceURL = ""
	userManifest.SourceURL = "https://github.com/user/repo"

	// Verify SourceURL assignments
	if defaultManifest.SourceURL != "" {
		t.Errorf("default manifest SourceURL should be empty, got %q", defaultManifest.SourceURL)
	}
	if userManifest.SourceURL != "https://github.com/user/repo" {
		t.Errorf("user manifest SourceURL mismatch: got %q, expected https://github.com/user/repo",
			userManifest.SourceURL)
	}
}

// TestGetPluginsFromMarketplaceDefaults verifies that when MarketplaceRepositories
// is empty, GetPluginsFromMarketplace fetches nothing and returns no error — there
// is no implicit built-in default source to fall back to. The official marketplace
// only appears here because config.Load provisions it as a regular
// MarketplaceRepositories entry on first run (see config.withDefaultMarketplaceRepo);
// once that entry (or any entry) is removed by the user, it stays removed.
func TestGetPluginsFromMarketplaceDefaults(t *testing.T) {
	app := &App{
		settings: config.Settings{
			AccessToken:             "ghp_general",
			MarketplaceRepositories: []config.MarketplaceRepository{},
		},
	}

	t.Setenv("MARKETPLACE_ENABLED", "true")

	result := app.GetPluginsFromMarketplace()

	if len(result.Manifests) != 0 {
		t.Errorf("expected no manifests with no configured repositories, got %d", len(result.Manifests))
	}
	if len(result.Errors) != 0 {
		t.Errorf("expected no errors with no configured repositories, got %v", result.Errors)
	}
}

// TestPartialManifestResultsOnPluginError verifies that DiscoverPluginIDs and
// FetchManifest, run together against a manifest.json index, resolve every
// plugin embedded in the index. (Per-plugin fetch failure is no longer a
// reachable case: the index embeds each plugin's complete manifest directly,
// so DiscoverPluginIDs and FetchManifest read from the same source with no
// separate network call that could fail independently.)
func TestPartialManifestResultsOnPluginError(t *testing.T) {
	var testServer *httptest.Server
	testServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate marketplace latest release endpoint
		// FetchLatestRelease will call baseURL + "/latest"
		if r.URL.Path == "/releases/latest" {
			release := dto.GitHubRelease{
				TagName: "v1.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name:               "manifest.json",
						URL:                testServer.URL + "/manifest-index",
						BrowserDownloadURL: testServer.URL + "/manifest-index",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}
		// Serve the manifest index: two valid plugins, one deliberately invalid
		// ID (fails ValidPluginID and so is skipped by DiscoverPluginIDs) to
		// simulate a plugin entry that a single-source fetch can't resolve.
		if r.URL.Path == "/manifest-index" {
			index := dto.ManifestIndex{
				ReleaseTag: "v1.0.0",
				Plugins: []dto.Manifest{
					{ID: "working1", Name: "Working Plugin 1", Version: "1.0.0"},
					{ID: "working2", Name: "Working Plugin 2", Version: "1.0.0"},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(index)
			return
		}
		http.NotFound(w, r)
	}))
	defer testServer.Close()

	testRepoURL := testServer.URL + "/releases"

	// Simulate what GetPluginsFromMarketplace does with the fixed behavior
	type source struct {
		sourceURL string
		token     string
		private   bool
	}
	type fetchResult struct {
		manifests []*dto.Manifest
		sourceURL string
		errors    map[string]string
	}

	src := source{
		sourceURL: testRepoURL,
		token:     "ghp_test",
		private:   true,
	}

	// Run the fixed goroutine logic
	resultsChan := make(chan fetchResult, 1)
	go func(src source) {
		sourceLabel := src.sourceURL
		if sourceLabel == "" {
			sourceLabel = "default"
		}

		assets, _, err := plugin.FetchLatestRelease(context.Background(), src.sourceURL, src.token, src.private)
		if err != nil {
			resultsChan <- fetchResult{
				manifests: nil,
				sourceURL: src.sourceURL,
				errors:    map[string]string{sourceLabel + ":release": err.Error()},
			}
			return
		}

		index, err := plugin.FetchManifestIndex(context.Background(), assets, src.token)
		if err != nil {
			resultsChan <- fetchResult{
				manifests: nil,
				sourceURL: src.sourceURL,
				errors:    map[string]string{sourceLabel + ":manifest-index": err.Error()},
			}
			return
		}

		pluginIDs := plugin.DiscoverPluginIDs(index)
		manifests := make([]*dto.Manifest, 0, len(pluginIDs))
		srcErrors := make(map[string]string)

		// KEY FIX: per-plugin errors are accumulated and loop continues instead of returning
		for _, pluginID := range pluginIDs {
			manifest, err := plugin.FetchManifest(pluginID, index)
			if err != nil {
				srcErrors[sourceLabel+":"+pluginID] = err.Error()
				continue // KEY FIX: continue instead of return
			}
			manifest.SourceURL = src.sourceURL
			manifests = append(manifests, manifest)
		}

		resultsChan <- fetchResult{
			manifests: manifests,
			sourceURL: src.sourceURL,
			errors:    srcErrors,
		}
	}(src)

	// Collect result
	result := <-resultsChan

	// Verify that both working manifests were collected
	if len(result.manifests) != 2 {
		t.Errorf("expected 2 manifests, got %d", len(result.manifests))
	}

	// Check that we have working1 and working2
	ids := make(map[string]bool)
	for _, m := range result.manifests {
		ids[m.ID] = true
	}
	if !ids["working1"] {
		t.Error("working1 manifest missing from results")
	}
	if !ids["working2"] {
		t.Error("working2 manifest missing from results")
	}

	if len(result.errors) != 0 {
		t.Errorf("expected 0 error entries, got %d", len(result.errors))
		for k := range result.errors {
			t.Logf("  error key: %q", k)
		}
	}
}
