package config

import (
	"testing"
)

// TestConfigMigration verifies that old-format config files (with flat marketplace fields)
// are correctly migrated to the new array-based format.
func TestConfigMigration(t *testing.T) {
	tests := []struct {
		name                               string
		rawJSON                            string
		expectedRepositoriesCount          int
		expectedFirstRepositoryURL         string
		expectedFirstRepositoryPrivate     bool
		expectedFirstRepositoryAccessToken string
		checkFirstRepoDetails              bool
	}{
		{
			name: "old-format config with flat marketplace fields",
			rawJSON: `{
  "accessToken": "ghp_general_token",
  "marketplaceRepoURL": "https://github.com/test/marketplace",
  "marketplacePrivate": true,
  "marketplaceAccessToken": "ghp_marketplace_token"
}`,
			expectedRepositoriesCount:          1,
			expectedFirstRepositoryURL:         "https://github.com/test/marketplace",
			expectedFirstRepositoryPrivate:     true,
			expectedFirstRepositoryAccessToken: "ghp_marketplace_token",
			checkFirstRepoDetails:              true,
		},
		{
			name: "new-format config with marketplaceRepositories array",
			rawJSON: `{
  "accessToken": "ghp_general_token",
  "marketplaceRepositories": [
    {
      "url": "https://github.com/repo1/plugins",
      "private": false,
      "accessToken": ""
    },
    {
      "url": "https://github.com/repo2/plugins",
      "private": true,
      "accessToken": "ghp_repo2_token"
    }
  ]
}`,
			expectedRepositoriesCount: 2,
			checkFirstRepoDetails:     false,
		},
		{
			name: "old-format with empty marketplaceRepoURL falls back to the provisioned default marketplace",
			rawJSON: `{
  "accessToken": "ghp_general_token",
  "marketplaceRepoURL": "",
  "marketplacePrivate": false,
  "marketplaceAccessToken": ""
}`,
			expectedRepositoriesCount:  1,
			expectedFirstRepositoryURL: GetMarketplaceBaseURL(),
			checkFirstRepoDetails:      true,
		},
		{
			name: "mixed config (new array takes precedence, no migration)",
			rawJSON: `{
  "accessToken": "ghp_general_token",
  "marketplaceRepoURL": "https://github.com/old/marketplace",
  "marketplaceRepositories": [
    {
      "url": "https://github.com/new/marketplace",
      "private": false,
      "accessToken": ""
    }
  ]
}`,
			expectedRepositoriesCount:  1,
			expectedFirstRepositoryURL: "https://github.com/new/marketplace",
			checkFirstRepoDetails:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var s Settings
			if err := unmarshalAndMigrate([]byte(tt.rawJSON), &s); err != nil {
				t.Fatalf("unmarshalAndMigrate() failed: %v", err)
			}

			// Verify count
			if len(s.MarketplaceRepositories) != tt.expectedRepositoriesCount {
				t.Errorf("repository count mismatch: got %d, expected %d",
					len(s.MarketplaceRepositories), tt.expectedRepositoriesCount)
			}

			// Verify first repository details if applicable
			if tt.checkFirstRepoDetails && tt.expectedRepositoriesCount > 0 {
				repo := s.MarketplaceRepositories[0]
				if repo.URL != tt.expectedFirstRepositoryURL {
					t.Errorf("first repository URL mismatch: got %q, expected %q",
						repo.URL, tt.expectedFirstRepositoryURL)
				}
				if repo.Private != tt.expectedFirstRepositoryPrivate {
					t.Errorf("first repository private mismatch: got %v, expected %v",
						repo.Private, tt.expectedFirstRepositoryPrivate)
				}
				if repo.AccessToken != tt.expectedFirstRepositoryAccessToken {
					t.Errorf("first repository access token mismatch: got %q, expected %q",
						repo.AccessToken, tt.expectedFirstRepositoryAccessToken)
				}
			}
		})
	}
}

// TestWithDefaultMarketplaceRepo verifies that the official galacius
// marketplace is provisioned as a MarketplaceRepositories entry only when a
// settings.json has never persisted that key — never on a config that has
// already been saved under the new schema, even with the array empty (the
// user deliberately removed every repository).
func TestWithDefaultMarketplaceRepo(t *testing.T) {
	t.Run("fresh install (no rawJSON) provisions the default", func(t *testing.T) {
		s := withDefaultMarketplaceRepo(Settings{}, nil)
		if len(s.MarketplaceRepositories) != 1 {
			t.Fatalf("expected 1 provisioned repository, got %d", len(s.MarketplaceRepositories))
		}
		if s.MarketplaceRepositories[0].URL != GetMarketplaceBaseURL() {
			t.Errorf("provisioned URL = %q; want %q", s.MarketplaceRepositories[0].URL, GetMarketplaceBaseURL())
		}
	})

	t.Run("legacy config with no marketplace key provisions the default", func(t *testing.T) {
		rawJSON := []byte(`{"accessToken": "ghp_general_token"}`)
		s := withDefaultMarketplaceRepo(Settings{}, rawJSON)
		if len(s.MarketplaceRepositories) != 1 {
			t.Fatalf("expected 1 provisioned repository, got %d", len(s.MarketplaceRepositories))
		}
		if s.MarketplaceRepositories[0].URL != GetMarketplaceBaseURL() {
			t.Errorf("provisioned URL = %q; want %q", s.MarketplaceRepositories[0].URL, GetMarketplaceBaseURL())
		}
	})

	t.Run("saved config with an explicitly empty array is left empty", func(t *testing.T) {
		rawJSON := []byte(`{"accessToken": "ghp_general_token", "marketplaceRepositories": []}`)
		s := withDefaultMarketplaceRepo(Settings{}, rawJSON)
		if len(s.MarketplaceRepositories) != 0 {
			t.Errorf("expected the user's explicit empty repositories list to be respected, got %d entries", len(s.MarketplaceRepositories))
		}
	})

	t.Run("saved config with a null array is left empty", func(t *testing.T) {
		rawJSON := []byte(`{"accessToken": "ghp_general_token", "marketplaceRepositories": null}`)
		s := withDefaultMarketplaceRepo(Settings{}, rawJSON)
		if len(s.MarketplaceRepositories) != 0 {
			t.Errorf("expected the user's explicit null repositories list to be respected, got %d entries", len(s.MarketplaceRepositories))
		}
	})

	t.Run("settings already carrying repositories are left untouched", func(t *testing.T) {
		s := withDefaultMarketplaceRepo(Settings{
			MarketplaceRepositories: []MarketplaceRepository{{URL: "https://github.com/user/repo"}},
		}, nil)
		if len(s.MarketplaceRepositories) != 1 || s.MarketplaceRepositories[0].URL != "https://github.com/user/repo" {
			t.Errorf("expected existing repositories to be left untouched, got %+v", s.MarketplaceRepositories)
		}
	})
}
