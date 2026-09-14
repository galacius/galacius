package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/galacius/galacius/internal/config"
	"github.com/galacius/galacius/internal/plugin"
	"github.com/galacius/galacius/packages/core/kube/dto"
)

// TestManifestIndexDiscovery_Present verifies that plugin manifests are read
// directly from the manifest.json index — the release's single source of
// truth (matching the real galacius-plugins release format: manifest.json
// embeds each plugin's complete manifest, no separate per-plugin manifest
// assets are published).
func TestManifestIndexDiscovery_Present(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/repos/test/plugins/releases/latest" {
			release := dto.GitHubRelease{
				TagName: "v1.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name:               "manifest.json",
						BrowserDownloadURL: server.URL + "/manifest-index",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}

		if r.URL.Path == "/manifest-index" {
			index := dto.ManifestIndex{
				ReleaseTag:  "v1.0.0",
				GeneratedAt: "2026-08-21T00:00:00Z",
				Plugins: []dto.Manifest{
					{ID: "helm", Name: "Helm Plugin", Version: "1.0.0"},
					{ID: "flux", Name: "Flux Plugin", Version: "1.0.0"},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(index)
			return
		}

		http.NotFound(w, r)
	}))
	defer server.Close()

	assets, _, err := plugin.FetchLatestRelease(context.Background(), server.URL+"/repos/test/plugins/releases", "test-token", false)
	if err != nil {
		t.Fatalf("FetchLatestRelease() failed: %v", err)
	}

	index, err := plugin.FetchManifestIndex(context.Background(), assets, "")
	if err != nil {
		t.Fatalf("FetchManifestIndex() failed: %v", err)
	}
	if index == nil {
		t.Fatal("FetchManifestIndex() returned nil, expected manifest index")
	}

	pluginIDs := plugin.DiscoverPluginIDs(index)
	if len(pluginIDs) != 2 {
		t.Errorf("DiscoverPluginIDs() returned %d IDs; want 2", len(pluginIDs))
	}
	expectedIDs := []string{"flux", "helm"} // sorted alphabetically
	for i, id := range pluginIDs {
		if id != expectedIDs[i] {
			t.Errorf("DiscoverPluginIDs()[%d] = %q; want %q", i, id, expectedIDs[i])
		}
	}

	helmManifest, err := plugin.FetchManifest("helm", index)
	if err != nil {
		t.Fatalf("FetchManifest(helm) failed: %v", err)
	}
	if helmManifest.Name != "Helm Plugin" {
		t.Errorf("FetchManifest(helm).Name = %q; want %q", helmManifest.Name, "Helm Plugin")
	}

	fluxManifest, err := plugin.FetchManifest("flux", index)
	if err != nil {
		t.Fatalf("FetchManifest(flux) failed: %v", err)
	}
	if fluxManifest.Name != "Flux Plugin" {
		t.Errorf("FetchManifest(flux).Name = %q; want %q", fluxManifest.Name, "Flux Plugin")
	}

	if _, err := plugin.FetchManifest("nonexistent", index); err == nil {
		t.Error("FetchManifest(nonexistent) succeeded; expected error for plugin not in index")
	}
}

// TestManifestIndexDiscovery_Absent verifies that a release with no
// manifest.json asset is a hard error — there is no filename-scan fallback,
// since real releases only ever publish manifest.json.
func TestManifestIndexDiscovery_Absent(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/repos/test/plugins/releases/latest" {
			release := dto.GitHubRelease{
				TagName: "v1.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name:               "other-file.txt",
						BrowserDownloadURL: server.URL + "/other",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}

		http.NotFound(w, r)
	}))
	defer server.Close()

	assets, _, err := plugin.FetchLatestRelease(context.Background(), server.URL+"/repos/test/plugins/releases", "test-token", false)
	if err != nil {
		t.Fatalf("FetchLatestRelease() failed: %v", err)
	}

	index, err := plugin.FetchManifestIndex(context.Background(), assets, "")
	if err == nil {
		t.Error("FetchManifestIndex() succeeded when manifest.json was absent; expected error")
	}
	if index != nil {
		t.Errorf("FetchManifestIndex() returned non-nil index when manifest.json was absent; expected nil")
	}
}

// TestManifestIndexDiscovery_Malformed verifies that a malformed manifest.json
// surfaces as an error for that source without affecting other sources.
func TestManifestIndexDiscovery_Malformed(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/repos/test/plugins/releases/latest" {
			release := dto.GitHubRelease{
				TagName: "v1.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name:               "manifest.json",
						BrowserDownloadURL: server.URL + "/manifest-index",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}

		if r.URL.Path == "/manifest-index" {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{invalid json`))
			return
		}

		http.NotFound(w, r)
	}))
	defer server.Close()

	assets, _, err := plugin.FetchLatestRelease(context.Background(), server.URL+"/repos/test/plugins/releases", "test-token", false)
	if err != nil {
		t.Fatalf("FetchLatestRelease() failed: %v", err)
	}

	index, err := plugin.FetchManifestIndex(context.Background(), assets, "")
	if err == nil {
		t.Error("FetchManifestIndex() succeeded on malformed JSON; expected error")
	}
	if index != nil {
		t.Errorf("FetchManifestIndex() returned non-nil index on error; expected nil")
	}
	if err != nil && !contains(err.Error(), "parsing manifest index JSON") {
		t.Errorf("FetchManifestIndex() error = %q; expected to mention JSON parsing", err.Error())
	}
}

// TestManifestIndexDiscovery_HTTPError verifies that an HTTP-level failure
// fetching manifest.json (asset present but unreachable/erroring) is surfaced
// as a distinct decode/fetch error.
func TestManifestIndexDiscovery_HTTPError(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/repos/test/plugins/releases/latest" {
			release := dto.GitHubRelease{
				TagName: "v1.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name:               "manifest.json",
						BrowserDownloadURL: server.URL + "/manifest-index",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}

		if r.URL.Path == "/manifest-index" {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		http.NotFound(w, r)
	}))
	defer server.Close()

	assets, _, err := plugin.FetchLatestRelease(context.Background(), server.URL+"/repos/test/plugins/releases", "test-token", false)
	if err != nil {
		t.Fatalf("FetchLatestRelease() failed: %v", err)
	}

	index, err := plugin.FetchManifestIndex(context.Background(), assets, "")
	if err == nil {
		t.Fatal("FetchManifestIndex() succeeded on HTTP 500; expected error")
	}
	if index != nil {
		t.Errorf("FetchManifestIndex() returned non-nil index on HTTP error; expected nil")
	}
	if contains(err.Error(), "not found in release") {
		t.Errorf("FetchManifestIndex() error = %q; HTTP error must not be confused with asset-absent case", err.Error())
	}
}

// TestGetPluginsFromMarketplace_ManifestIndex verifies that
// GetPluginsFromMarketplace reads plugins from the manifest index, matching
// the real galacius-plugins release format.
func TestGetPluginsFromMarketplace_ManifestIndex(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/repos/test/plugins/releases/latest" {
			release := dto.GitHubRelease{
				TagName: "v1.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name:               "manifest.json",
						BrowserDownloadURL: server.URL + "/manifest-index",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}

		if r.URL.Path == "/manifest-index" {
			index := dto.ManifestIndex{
				ReleaseTag:  "v1.0.0",
				GeneratedAt: "2026-08-21T00:00:00Z",
				Plugins: []dto.Manifest{
					{ID: "helm", Name: "Helm Plugin", Version: "1.0.0"},
					{ID: "flux", Name: "Flux Plugin", Version: "1.0.0"},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(index)
			return
		}

		http.NotFound(w, r)
	}))
	defer server.Close()

	app := &App{
		settings: config.Settings{
			MarketplaceRepositories: []config.MarketplaceRepository{
				{URL: server.URL + "/repos/test/plugins/releases", AccessToken: "test-token"},
			},
		},
	}

	t.Setenv("MARKETPLACE_ENABLED", "true")

	result := app.GetPluginsFromMarketplace()

	if len(result.Manifests) != 2 {
		t.Errorf("GetPluginsFromMarketplace() returned %d manifests; want 2", len(result.Manifests))
	}

	pluginNames := make(map[string]bool)
	for _, m := range result.Manifests {
		pluginNames[m.ID] = true
	}
	if !pluginNames["helm"] {
		t.Error("GetPluginsFromMarketplace() missing helm plugin")
	}
	if !pluginNames["flux"] {
		t.Error("GetPluginsFromMarketplace() missing flux plugin")
	}

	if len(result.Errors) > 0 {
		t.Errorf("GetPluginsFromMarketplace() returned errors: %v", result.Errors)
	}
}

// TestGetPluginsFromMarketplace_ManifestIndexMissing verifies that a source
// whose release has no manifest.json asset surfaces a per-source error
// without affecting other sources' results.
func TestGetPluginsFromMarketplace_ManifestIndexMissing(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/repos/test/plugins/releases/latest" {
			release := dto.GitHubRelease{TagName: "v1.0.0"}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}
		http.NotFound(w, r)
	}))
	defer server.Close()

	sourceURL := server.URL + "/repos/test/plugins/releases"
	app := &App{
		settings: config.Settings{
			MarketplaceRepositories: []config.MarketplaceRepository{
				{URL: sourceURL, AccessToken: "test-token"},
			},
		},
	}

	t.Setenv("MARKETPLACE_ENABLED", "true")

	result := app.GetPluginsFromMarketplace()

	if len(result.Manifests) != 0 {
		t.Errorf("GetPluginsFromMarketplace() returned %d manifests; want 0", len(result.Manifests))
	}
	if result.Errors[sourceURL+":manifest-index"] == "" {
		t.Error("GetPluginsFromMarketplace() missing manifest-index error for source with no manifest.json")
	}
}

// TestInstallPlugin_UsesManifestIndex verifies InstallPlugin resolves the
// plugin's manifest via the manifest.json index (matching real
// galacius-plugins releases, which only publish manifest.json — there is no
// per-plugin "galacius-plugin-<id>-manifest.json" asset). Regression test for
// the bug where InstallPlugin passed a nil index to FetchManifest
// unconditionally, causing "manifest asset ... not found in release" for
// every real release.
func TestInstallPlugin_UsesManifestIndex(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/repos/test/plugins/releases/latest" {
			release := dto.GitHubRelease{
				TagName: "v1.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name:               "manifest.json",
						BrowserDownloadURL: server.URL + "/manifest-index",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
			return
		}

		if r.URL.Path == "/manifest-index" {
			index := dto.ManifestIndex{
				ReleaseTag: "v1.0.0",
				Plugins: []dto.Manifest{
					{ID: "helm", Name: "Helm Plugin", Version: "1.0.0"},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(index)
			return
		}

		http.NotFound(w, r)
	}))
	defer server.Close()

	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")
	sourceURL := server.URL + "/repos/test/plugins/releases"
	app.settings.MarketplaceRepositories = []config.MarketplaceRepository{
		{URL: sourceURL, AccessToken: "test-token"},
	}

	if err := app.InstallPlugin("helm", "", sourceURL); err != nil {
		t.Fatalf("InstallPlugin() sync error = %v; want nil", err)
	}

	app.pluginsMu.Lock()
	loader, ok := app.pluginLoaders["helm"]
	app.pluginsMu.Unlock()
	if !ok {
		t.Fatal("expected plugin loader to be created")
	}

	// Poll until the async install goroutine moves past INSTALLING (it will
	// fail later at the unsupported-platform check since no OS entry is set
	// on the test manifest — that's fine, we only assert it did NOT fail at
	// the manifest-fetch step with a "manifest asset ... not found" error).
	deadline := time.Now().Add(5 * time.Second)
	for loader.Status() == dto.PluginStatusInstalling && time.Now().Before(deadline) {
		time.Sleep(20 * time.Millisecond)
	}

	if loader.Status() == dto.PluginStatusInstalling {
		t.Fatal("install did not complete within timeout")
	}
	if contains(loader.LastError(), "not found in release") {
		t.Errorf("InstallPlugin() failed at manifest-fetch step; error = %q", loader.LastError())
	}
}

// contains is a helper to check if a string contains a substring.
func contains(s, substr string) bool {
	for i := 0; i < len(s)-len(substr)+1; i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
