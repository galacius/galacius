package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// TestLoadFreshInstall tests that Load() returns zero-value Settings (aside
// from the provisioned default marketplace repository) with no error when no
// settings file exists anywhere, and no file is created until Save() is called.
func TestLoadFreshInstall(t *testing.T) {
	// Create a temporary home directory
	tmpHome := t.TempDir()
	origHome := os.Getenv("HOME")
	t.Cleanup(func() {
		os.Setenv("HOME", origHome)
	})
	os.Setenv("HOME", tmpHome)

	// Load should succeed with no file
	s, err := Load()
	if err != nil {
		t.Fatalf("Load() failed on fresh install: %v", err)
	}

	// Verify zero-value Settings, aside from the provisioned default marketplace
	if s.AccessToken != "" || s.ShellPath != "" {
		t.Errorf("Load() returned non-zero Settings on fresh install: %+v", s)
	}
	if len(s.MarketplaceRepositories) != 1 || s.MarketplaceRepositories[0].URL != GetMarketplaceBaseURL() {
		t.Errorf("Load() did not provision the default marketplace repository on fresh install: %+v", s.MarketplaceRepositories)
	}

	// Verify no file was created
	settingsPath := filepath.Join(tmpHome, ".galacius", "settings.json")
	if _, err := os.Stat(settingsPath); !os.IsNotExist(err) {
		t.Errorf("Load() created a settings file before Save() was called")
	}

	// Now save and verify file is created
	if err := Save(s); err != nil {
		t.Fatalf("Save() failed: %v", err)
	}
	if _, err := os.Stat(settingsPath); err != nil {
		t.Errorf("Save() did not create settings file: %v", err)
	}
}

// TestLoadNewLocationExists tests that Load() reads from the new location
// when ~/.galacius/settings.json exists, without attempting migration.
func TestLoadNewLocationExists(t *testing.T) {
	tmpHome := t.TempDir()
	origHome := os.Getenv("HOME")
	t.Cleanup(func() {
		os.Setenv("HOME", origHome)
	})
	os.Setenv("HOME", tmpHome)

	// Create new location with a known settings value
	newPath := filepath.Join(tmpHome, ".galacius", "settings.json")
	os.MkdirAll(filepath.Dir(newPath), 0o700)
	testSettings := Settings{
		AccessToken: "test_token_new_location",
		ShellPath:   "/bin/bash",
	}
	data, _ := json.MarshalIndent(testSettings, "", "  ")
	os.WriteFile(newPath, data, 0o600)

	// Load and verify it reads from new location
	s, err := Load()
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}
	if s.AccessToken != "test_token_new_location" || s.ShellPath != "/bin/bash" {
		t.Errorf("Load() did not read from new location correctly: %+v", s)
	}
}

// TestUnmarshalAndMigrateLegacyFields tests the flat-field marketplace migration
// (unrelated to settings file location) via unmarshalAndMigrate.
func TestUnmarshalAndMigrateLegacyFields(t *testing.T) {
	oldSettings := `{
  "accessToken": "legacy_token",
  "marketplaceRepoURL": "https://github.com/legacy/plugins",
  "marketplacePrivate": true,
  "marketplaceAccessToken": "legacy_marketplace_token"
}`

	var s Settings
	if err := unmarshalAndMigrate([]byte(oldSettings), &s); err != nil {
		t.Fatalf("unmarshalAndMigrate failed: %v", err)
	}

	// Verify settings were loaded
	if s.AccessToken != "legacy_token" {
		t.Errorf("unmarshalAndMigrate did not read AccessToken: got %q", s.AccessToken)
	}

	// Verify marketplace migration (flat fields -> array)
	if len(s.MarketplaceRepositories) != 1 {
		t.Errorf("unmarshalAndMigrate did not migrate marketplace fields: got %d repositories, expected 1",
			len(s.MarketplaceRepositories))
	} else {
		repo := s.MarketplaceRepositories[0]
		if repo.URL != "https://github.com/legacy/plugins" {
			t.Errorf("marketplace migration failed on URL: got %q", repo.URL)
		}
		if !repo.Private {
			t.Errorf("marketplace migration failed on Private: got %v", repo.Private)
		}
		if repo.AccessToken != "legacy_marketplace_token" {
			t.Errorf("marketplace migration failed on AccessToken: got %q", repo.AccessToken)
		}
	}
}

// TestUnmarshalCorruptJSON tests that unmarshalAndMigrate fails when JSON is corrupt.
// This validates that invalid JSON is rejected (vs silently falling back).
func TestUnmarshalCorruptJSON(t *testing.T) {
	corruptJSON := `{ corrupt json without closing brace`

	var s Settings
	err := unmarshalAndMigrate([]byte(corruptJSON), &s)
	if err == nil {
		t.Errorf("unmarshalAndMigrate should fail on corrupt JSON, got: %+v", s)
	}
}

// TestUnmarshalAndMigrate tests the extracted unmarshalAndMigrate helper directly.
// This covers the legacy flat-field marketplace migration logic.
func TestUnmarshalAndMigrate(t *testing.T) {
	tests := []struct {
		name                       string
		rawJSON                    string
		expectedAccessToken        string
		expectedRepositoriesCount  int
		expectedFirstRepoURL       string
		expectedFirstRepoPrivate   bool
		expectedFirstRepoToken     string
	}{
		{
			name: "old flat fields migrated to array",
			rawJSON: `{
  "accessToken": "token1",
  "marketplaceRepoURL": "https://github.com/repo1/plugins",
  "marketplacePrivate": true,
  "marketplaceAccessToken": "token_marketplace"
}`,
			expectedAccessToken:       "token1",
			expectedRepositoriesCount: 1,
			expectedFirstRepoURL:       "https://github.com/repo1/plugins",
			expectedFirstRepoPrivate:   true,
			expectedFirstRepoToken:     "token_marketplace",
		},
		{
			name: "empty marketplaceRepoURL falls back to the provisioned default marketplace",
			rawJSON: `{
  "accessToken": "token2",
  "marketplaceRepoURL": "",
  "marketplacePrivate": false,
  "marketplaceAccessToken": ""
}`,
			expectedAccessToken:       "token2",
			expectedRepositoriesCount: 1,
			expectedFirstRepoURL:      GetMarketplaceBaseURL(),
		},
		{
			name: "new array format preserved",
			rawJSON: `{
  "accessToken": "token3",
  "marketplaceRepositories": [
    {
      "url": "https://github.com/repo3/plugins",
      "private": false,
      "accessToken": ""
    }
  ]
}`,
			expectedAccessToken:       "token3",
			expectedRepositoriesCount: 1,
			expectedFirstRepoURL:       "https://github.com/repo3/plugins",
			expectedFirstRepoPrivate:   false,
			expectedFirstRepoToken:     "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var s Settings
			if err := unmarshalAndMigrate([]byte(tt.rawJSON), &s); err != nil {
				t.Fatalf("unmarshalAndMigrate failed: %v", err)
			}

			if s.AccessToken != tt.expectedAccessToken {
				t.Errorf("AccessToken mismatch: got %q, expected %q", s.AccessToken, tt.expectedAccessToken)
			}

			if len(s.MarketplaceRepositories) != tt.expectedRepositoriesCount {
				t.Errorf("repository count mismatch: got %d, expected %d",
					len(s.MarketplaceRepositories), tt.expectedRepositoriesCount)
			}

			if tt.expectedRepositoriesCount > 0 && len(s.MarketplaceRepositories) > 0 {
				repo := s.MarketplaceRepositories[0]
				if repo.URL != tt.expectedFirstRepoURL {
					t.Errorf("first repo URL mismatch: got %q, expected %q", repo.URL, tt.expectedFirstRepoURL)
				}
				if repo.Private != tt.expectedFirstRepoPrivate {
					t.Errorf("first repo Private mismatch: got %v, expected %v", repo.Private, tt.expectedFirstRepoPrivate)
				}
				if repo.AccessToken != tt.expectedFirstRepoToken {
					t.Errorf("first repo AccessToken mismatch: got %q, expected %q", repo.AccessToken, tt.expectedFirstRepoToken)
				}
			}
		})
	}
}

// TestNewLocationTakesPrecedence tests that if the new location file exists,
// Load() reads directly from it without attempting to check the legacy location.
func TestNewLocationTakesPrecedence(t *testing.T) {
	tmpHome := t.TempDir()
	origHome := os.Getenv("HOME")
	t.Cleanup(func() {
		os.Setenv("HOME", origHome)
	})
	os.Setenv("HOME", tmpHome)

	// Create new location with a distinctive token
	newPath := filepath.Join(tmpHome, ".galacius", "settings.json")
	os.MkdirAll(filepath.Dir(newPath), 0o700)
	newSettings := `{"accessToken": "new_location_token"}`
	os.WriteFile(newPath, []byte(newSettings), 0o600)

	// Load should read from new location
	s, err := Load()
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}

	if s.AccessToken != "new_location_token" {
		t.Errorf("Load() did not read from new location: got token %q, expected new_location_token", s.AccessToken)
	}
}
