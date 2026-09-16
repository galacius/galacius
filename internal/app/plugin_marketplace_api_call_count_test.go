package app

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/galacius/galacius/internal/config"
	"github.com/galacius/galacius/packages/core/kube/dto"
)

// newCountingMarketplaceServer builds a test GitHub-releases server that
// serves a release with a manifest.json index containing pluginCount
// plugins, tracking how many times the "/latest" release endpoint and the
// manifest.json asset endpoint are each hit.
func newCountingMarketplaceServer(t *testing.T, idPrefix string, pluginCount int, latestCalls, manifestCalls *atomic.Int32) *httptest.Server {
	t.Helper()

	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/repos/test/plugins/releases/latest":
			latestCalls.Add(1)
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
		case "/manifest-index":
			manifestCalls.Add(1)
			plugins := make([]dto.Manifest, 0, pluginCount)
			for i := 0; i < pluginCount; i++ {
				plugins = append(plugins, dto.Manifest{
					ID:      idPrefix + string(rune('a'+i)),
					Name:    "Plugin",
					Version: "1.0.0",
				})
			}
			index := dto.ManifestIndex{
				ReleaseTag: "v1.0.0",
				Plugins:    plugins,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(index)
		default:
			http.NotFound(w, r)
		}
	}))
	return server
}

// TestGetPluginsFromMarketplace_OneAPICallPerSource verifies that a single
// configured marketplace source results in exactly one call to the GitHub
// "/latest" release endpoint and exactly one call to fetch manifest.json,
// regardless of how many plugins the release publishes — DiscoverPluginIDs
// and FetchManifest read from the already-fetched index in memory and must
// never trigger additional network round trips per plugin.
func TestGetPluginsFromMarketplace_OneAPICallPerSource(t *testing.T) {
	var latestCalls, manifestCalls atomic.Int32
	server := newCountingMarketplaceServer(t, "plugin", 5, &latestCalls, &manifestCalls)
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

	if len(result.Manifests) != 5 {
		t.Fatalf("GetPluginsFromMarketplace() returned %d manifests; want 5", len(result.Manifests))
	}
	if got := latestCalls.Load(); got != 1 {
		t.Errorf("/latest called %d times; want exactly 1", got)
	}
	if got := manifestCalls.Load(); got != 1 {
		t.Errorf("manifest.json fetched %d times; want exactly 1", got)
	}
}

// TestGetPluginsFromMarketplace_MultipleSourcesEachCalledOnce verifies that
// with several configured sources, each source's "/latest" and manifest.json
// endpoints are hit exactly once — the per-source call count doesn't scale
// with plugin count, and one source's fetch never triggers extra calls
// against another source.
func TestGetPluginsFromMarketplace_MultipleSourcesEachCalledOnce(t *testing.T) {
	var latestCallsA, manifestCallsA atomic.Int32
	serverA := newCountingMarketplaceServer(t, "a-plugin", 2, &latestCallsA, &manifestCallsA)
	defer serverA.Close()

	var latestCallsB, manifestCallsB atomic.Int32
	serverB := newCountingMarketplaceServer(t, "b-plugin", 3, &latestCallsB, &manifestCallsB)
	defer serverB.Close()

	app := &App{
		settings: config.Settings{
			MarketplaceRepositories: []config.MarketplaceRepository{
				{URL: serverA.URL + "/repos/test/plugins/releases", AccessToken: "test-token"},
				{URL: serverB.URL + "/repos/test/plugins/releases", AccessToken: "test-token"},
			},
		},
	}
	t.Setenv("MARKETPLACE_ENABLED", "true")

	result := app.GetPluginsFromMarketplace()

	if len(result.Manifests) != 5 {
		t.Fatalf("GetPluginsFromMarketplace() returned %d manifests; want 5", len(result.Manifests))
	}

	if got := latestCallsA.Load(); got != 1 {
		t.Errorf("source A: /latest called %d times; want exactly 1", got)
	}
	if got := manifestCallsA.Load(); got != 1 {
		t.Errorf("source A: manifest.json fetched %d times; want exactly 1", got)
	}
	if got := latestCallsB.Load(); got != 1 {
		t.Errorf("source B: /latest called %d times; want exactly 1", got)
	}
	if got := manifestCallsB.Load(); got != 1 {
		t.Errorf("source B: manifest.json fetched %d times; want exactly 1", got)
	}
}

// TestGetPluginsFromMarketplace_DisabledRepoMakesNoCalls verifies that a
// disabled repository is skipped entirely and never contributes any GitHub
// API calls, so toggling a repository off actually stops it from consuming
// rate-limit budget.
func TestGetPluginsFromMarketplace_DisabledRepoMakesNoCalls(t *testing.T) {
	var latestCalls, manifestCalls atomic.Int32
	server := newCountingMarketplaceServer(t, "plugin", 1, &latestCalls, &manifestCalls)
	defer server.Close()

	app := &App{
		settings: config.Settings{
			MarketplaceRepositories: []config.MarketplaceRepository{
				{URL: server.URL + "/repos/test/plugins/releases", Disabled: true},
			},
		},
	}
	t.Setenv("MARKETPLACE_ENABLED", "true")

	result := app.GetPluginsFromMarketplace()

	if len(result.Manifests) != 0 {
		t.Errorf("GetPluginsFromMarketplace() returned %d manifests; want 0 for a disabled repo", len(result.Manifests))
	}
	if got := latestCalls.Load(); got != 0 {
		t.Errorf("/latest called %d times for a disabled repo; want 0", got)
	}
	if got := manifestCalls.Load(); got != 0 {
		t.Errorf("manifest.json fetched %d times for a disabled repo; want 0", got)
	}
}

// TestGetPluginsFromMarketplace_PrivateRepoAssetUsesAPIEndpoint documents and
// locks in the one unavoidable exception to "one API call per source": a
// private repository must fetch its manifest.json via the authenticated
// api.github.com asset endpoint (asset.URL), which itself counts against the
// GitHub REST rate limit, rather than the public browser_download_url CDN
// link — so private sources cost two rate-limited calls, never more.
func TestGetPluginsFromMarketplace_PrivateRepoAssetUsesAPIEndpoint(t *testing.T) {
	var latestCalls, assetAPICalls atomic.Int32

	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/repos/test/plugins/releases/latest":
			latestCalls.Add(1)
			release := dto.GitHubRelease{
				TagName: "v1.0.0",
				Assets: []dto.GitHubAsset{
					{
						Name: "manifest.json",
						// Private repos must be fetched via the API asset
						// endpoint (asset.URL), never the CDN download URL.
						URL:                server.URL + "/repos/test/plugins/releases/assets/1",
						BrowserDownloadURL: server.URL + "/should-not-be-used",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(release)
		case "/repos/test/plugins/releases/assets/1":
			assetAPICalls.Add(1)
			index := dto.ManifestIndex{
				ReleaseTag: "v1.0.0",
				Plugins:    []dto.Manifest{{ID: "helm", Name: "Helm Plugin", Version: "1.0.0"}},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(index)
		case "/should-not-be-used":
			t.Errorf("private repo must not use browser_download_url")
			http.NotFound(w, r)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	app := &App{
		settings: config.Settings{
			MarketplaceRepositories: []config.MarketplaceRepository{
				{URL: server.URL + "/repos/test/plugins/releases", Private: true, AccessToken: "test-token"},
			},
		},
	}
	t.Setenv("MARKETPLACE_ENABLED", "true")

	result := app.GetPluginsFromMarketplace()

	if len(result.Manifests) != 1 {
		t.Fatalf("GetPluginsFromMarketplace() returned %d manifests; want 1", len(result.Manifests))
	}
	if got := latestCalls.Load(); got != 1 {
		t.Errorf("/latest called %d times; want exactly 1", got)
	}
	if got := assetAPICalls.Load(); got != 1 {
		t.Errorf("asset API endpoint called %d times; want exactly 1", got)
	}
}
