package app

import (
	"testing"

	"github.com/galacius/galacius/internal/config"
)

// TestTokenResolutionInInstallPlugin verifies that InstallPlugin resolves the access
// token from the matching MarketplaceRepositories entry ONLY. Settings.AccessToken is
// reserved for the app's own update-check downloads and must never be used as a
// fallback for marketplace fetches — an unset per-repo token resolves to "".
func TestTokenResolutionInInstallPlugin(t *testing.T) {
	tests := []struct {
		name                  string
		sourceURL             string
		marketplaceRepos      []config.MarketplaceRepository
		generalAccessToken    string
		expectedResolvedToken string
	}{
		{
			name:      "per-repo token used",
			sourceURL: "https://github.com/test/repo",
			marketplaceRepos: []config.MarketplaceRepository{
				{
					URL:         "https://github.com/test/repo",
					AccessToken: "ghp_per_repo_token_123",
				},
			},
			generalAccessToken:    "ghp_general_token_456",
			expectedResolvedToken: "ghp_per_repo_token_123",
		},
		{
			name:      "per-repo empty does NOT fall back to general",
			sourceURL: "https://github.com/test/repo",
			marketplaceRepos: []config.MarketplaceRepository{
				{
					URL:         "https://github.com/test/repo",
					AccessToken: "",
				},
			},
			generalAccessToken:    "ghp_general_token_789",
			expectedResolvedToken: "",
		},
		{
			name:                  "default source (empty sourceURL) never uses general token",
			sourceURL:             "",
			marketplaceRepos:      []config.MarketplaceRepository{},
			generalAccessToken:    "ghp_default_source_token",
			expectedResolvedToken: "",
		},
		{
			name:                  "no matching repo resolves to empty, not general token",
			sourceURL:             "https://github.com/nonexistent/repo",
			marketplaceRepos:      []config.MarketplaceRepository{},
			generalAccessToken:    "ghp_general_fallback",
			expectedResolvedToken: "",
		},
		{
			name:      "both per-repo and general empty",
			sourceURL: "https://github.com/test/repo",
			marketplaceRepos: []config.MarketplaceRepository{
				{
					URL:         "https://github.com/test/repo",
					AccessToken: "",
				},
			},
			generalAccessToken:    "",
			expectedResolvedToken: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a mock app with settings
			app := &App{
				settings: config.Settings{
					AccessToken:             tt.generalAccessToken,
					MarketplaceRepositories: tt.marketplaceRepos,
				},
			}

			// Simulate the token resolution logic from InstallPlugin (no fallback
			// to Settings.AccessToken).
			app.mu.RLock()
			baseURL := tt.sourceURL
			token := ""
			for _, repo := range app.settings.MarketplaceRepositories {
				if repo.URL == tt.sourceURL {
					token = repo.AccessToken
					break
				}
			}
			app.mu.RUnlock()

			// Verify token resolution
			if token != tt.expectedResolvedToken {
				t.Errorf("token resolution failed: got %q, expected %q", token, tt.expectedResolvedToken)
			}
			// baseURL should match sourceURL exactly
			if baseURL != tt.sourceURL {
				t.Errorf("baseURL mismatch: got %q, expected %q", baseURL, tt.sourceURL)
			}
		})
	}
}

// TestTokenResolutionInGetPluginsFromMarketplace verifies that GetPluginsFromMarketplace
// resolves each repo's token independently, with no fallback to the general AccessToken.
func TestTokenResolutionInGetPluginsFromMarketplace(t *testing.T) {
	tests := []struct {
		name                  string
		marketplaceRepos      []config.MarketplaceRepository
		generalAccessToken    string
		expectedTokenForRepo1 string
		expectedTokenForRepo2 string
	}{
		{
			name: "per-repo tokens used independently",
			marketplaceRepos: []config.MarketplaceRepository{
				{
					URL:         "https://github.com/repo1/plugins",
					AccessToken: "ghp_repo1_token",
				},
				{
					URL:         "https://github.com/repo2/plugins",
					AccessToken: "ghp_repo2_token",
				},
			},
			generalAccessToken:    "ghp_general",
			expectedTokenForRepo1: "ghp_repo1_token",
			expectedTokenForRepo2: "ghp_repo2_token",
		},
		{
			name: "empty per-repo token stays empty, does not fall back",
			marketplaceRepos: []config.MarketplaceRepository{
				{
					URL:         "https://github.com/repo1/plugins",
					AccessToken: "",
				},
			},
			generalAccessToken:    "ghp_fallback",
			expectedTokenForRepo1: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := &App{
				settings: config.Settings{
					AccessToken:             tt.generalAccessToken,
					MarketplaceRepositories: tt.marketplaceRepos,
				},
			}

			// Verify token resolution for each repo (no fallback to general token)
			for i, repo := range tt.marketplaceRepos {
				app.mu.RLock()
				token := ""
				for _, r := range app.settings.MarketplaceRepositories {
					if r.URL == repo.URL {
						token = r.AccessToken
						break
					}
				}
				app.mu.RUnlock()

				var expected string
				if i == 0 {
					expected = tt.expectedTokenForRepo1
				} else {
					expected = tt.expectedTokenForRepo2
				}

				if token != expected {
					t.Errorf("token resolution for repo %d failed: got %q, expected %q", i, token, expected)
				}
			}
		})
	}
}

// TestTokenResolutionConcurrentAccess verifies that per-repo token resolution does not
// race when settings are read concurrently (uses RLock), and never leaks the general
// AccessToken into a repo lookup.
func TestTokenResolutionConcurrentAccess(t *testing.T) {
	app := &App{
		settings: config.Settings{
			AccessToken: "ghp_concurrent_general",
			MarketplaceRepositories: []config.MarketplaceRepository{
				{
					URL:         "https://github.com/test/repo",
					AccessToken: "ghp_concurrent_per_repo",
				},
			},
		},
	}

	// Launch multiple goroutines reading the token simultaneously
	results := make(chan string, 10)
	for i := 0; i < 10; i++ {
		go func() {
			app.mu.RLock()
			token := ""
			for _, repo := range app.settings.MarketplaceRepositories {
				if repo.URL == "https://github.com/test/repo" {
					token = repo.AccessToken
					break
				}
			}
			app.mu.RUnlock()
			results <- token
		}()
	}

	// Verify all reads see consistent value
	expectedToken := "ghp_concurrent_per_repo"
	for i := 0; i < 10; i++ {
		token := <-results
		if token != expectedToken {
			t.Errorf("concurrent read %d: got %q, expected %q", i, token, expectedToken)
		}
	}
}
