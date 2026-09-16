package updater

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	goruntime "runtime"
	"strings"
	"testing"
	"time"

	"github.com/galacius/galacius/internal/lib/ratelimiter"
)

// TestCheck covers the primary happy-path and common-failure behavior of
// Check. Additional semver-validation boundary cases live in
// Test_Check_EdgeCases to keep this table focused.
func TestCheck(t *testing.T) {
	tests := []struct {
		name           string
		current        string
		serverResponse *Release
		serverStatus   int
		wantRelease    bool
	}{
		{
			name:        "dev build returns nil",
			current:     "dev",
			wantRelease: false,
		},
		{
			name:        "invalid semver returns nil",
			current:     "not-a-version",
			wantRelease: false,
		},
		{
			name:        "empty string returns nil",
			current:     "",
			wantRelease: false,
		},
		{
			name:    "server error returns nil",
			current: "v1.0.0",
			serverResponse: &Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets:  []Asset{},
			},
			serverStatus: http.StatusInternalServerError,
			wantRelease:  false,
		},
		{
			name:    "non-200 status returns nil",
			current: "v1.0.0",
			serverResponse: &Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets:  []Asset{},
			},
			serverStatus: http.StatusNotFound,
			wantRelease:  false,
		},
		{
			name:    "latest equal to current returns nil",
			current: "v1.0.0",
			serverResponse: &Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets:  []Asset{},
			},
			serverStatus: http.StatusOK,
			wantRelease:  false,
		},
		{
			name:    "latest older than current returns nil",
			current: "v1.5.0",
			serverResponse: &Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets:  []Asset{},
			},
			serverStatus: http.StatusOK,
			wantRelease:  false,
		},
		{
			name:    "newer release without v prefix is prefixed",
			current: "v1.0.0",
			serverResponse: &Release{
				TagName: "1.5.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets:  []Asset{},
			},
			serverStatus: http.StatusOK,
			wantRelease:  true,
		},
		{
			name:    "newer release with v prefix",
			current: "v1.0.0",
			serverResponse: &Release{
				TagName: "v2.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets:  []Asset{},
			},
			serverStatus: http.StatusOK,
			wantRelease:  true,
		},
		{
			name:    "newer release with platform asset",
			current: "v1.0.0",
			serverResponse: &Release{
				TagName: "v2.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets: []Asset{
					{
						Name:               fmt.Sprintf("galacius-%s-%s", goruntime.GOOS, goruntime.GOARCH),
						URL:                "https://api.github.com/repos/galacius/galacius/releases/assets/1",
						BrowserDownloadURL: "https://example.com/download",
						Size:               1024,
					},
				},
			},
			serverStatus: http.StatusOK,
			wantRelease:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create server first so we have the URL for the handlers
			server := httptest.NewServer(http.NewServeMux())
			serverURL := server.URL
			defer server.Close()

			// Set up the handler with the known server URL
			server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/releases/latest" {
					w.WriteHeader(tt.serverStatus)
					if tt.serverResponse != nil && tt.serverStatus == http.StatusOK {
						// Add manifest.json asset for authenticated tests
						resp := *tt.serverResponse
						resp.Assets = make([]Asset, len(tt.serverResponse.Assets))
						copy(resp.Assets, tt.serverResponse.Assets)
						// Fix asset names to match manifest filenames
						hasPlatformAsset := false
						for i := range resp.Assets {
							if strings.Contains(resp.Assets[i].Name, goruntime.GOOS) && strings.Contains(resp.Assets[i].Name, goruntime.GOARCH) {
								resp.Assets[i].Name = getAssetNameForPlatform()
								hasPlatformAsset = true
							}
						}
						// If no platform asset in test data, add one
						if !hasPlatformAsset && len(resp.Assets) == 0 {
							resp.Assets = append(resp.Assets, Asset{
								Name:               getAssetNameForPlatform(),
								URL:                serverURL + "/releases/assets/app",
								BrowserDownloadURL: serverURL + "/releases/assets/app",
								Size:               1024,
							})
						}
						resp.Assets = append(resp.Assets, Asset{
							Name:               "manifest.json",
							URL:                serverURL + "/releases/assets/manifest",
							BrowserDownloadURL: serverURL + "/releases/assets/manifest",
							Size:               256,
						})
						json.NewEncoder(w).Encode(resp)
					}
				} else if r.URL.Path == "/releases/assets/manifest" {
					w.Header().Set("Content-Type", "application/json")
					fmt.Fprintf(w, `{
						"version": "v2.0.0",
						"release_tag": "v2.0.0",
						"generated_at": "2026-08-11T00:00:00Z",
						"artifacts": [
							{"os": "darwin", "arch": "arm64", "filename": "galacius-darwin-arm64.zip", "sha256": "abc123", "size": 1024},
							{"os": "linux", "arch": "amd64", "filename": "galacius-linux-amd64.tar.gz", "sha256": "def456", "size": 1024},
							{"os": "windows", "arch": "amd64", "filename": "galacius-windows-amd64.exe", "sha256": "ghi789", "size": 1024}
						]
					}`)
				} else {
					w.WriteHeader(http.StatusNotFound)
				}
			})

			t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

			got, err := Check(tt.current, "test-token")
			if (got != nil) != tt.wantRelease {
				t.Errorf("Check(%q, token): got release=%v, want release=%v", tt.current, got != nil, tt.wantRelease)
			}
			// For the primary happy-path test, we expect no error on success or no-update cases
			if tt.wantRelease && err != nil {
				t.Errorf("Check(%q, token): got err=%v, want nil", tt.current, err)
			}

			if tt.wantRelease && got != nil {
				if got.TagName != tt.serverResponse.TagName && got.TagName != "v"+tt.serverResponse.TagName {
					t.Errorf("Check() TagName = %q, want %q or v%q", got.TagName, tt.serverResponse.TagName, tt.serverResponse.TagName)
				}
				if len(tt.serverResponse.Assets) > 0 && got.AssetURL == "" {
					t.Errorf("Check() expected AssetURL to be populated for platform asset")
				}
				if got.SHA256 == "" {
					t.Errorf("Check() expected SHA256 to be populated from manifest")
				}
			}
		})
	}
}

func TestCheckPrivateRepoAccess(t *testing.T) {
	tests := []struct {
		name              string
		privateRepoAccess string
		wantAssetURL      string
	}{
		{
			name:              "private repo access enabled uses URL field",
			privateRepoAccess: "true",
			wantAssetURL:      "https://api.github.com/repos/test-owner/test-repo/releases/assets/1",
		},
		{
			name:              "private repo access disabled uses BrowserDownloadURL field",
			privateRepoAccess: "false",
			wantAssetURL:      "https://example.com/download",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.NewServeMux())
			serverURL := server.URL
			defer server.Close()

			server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch r.URL.Path {
				case "/releases/latest":
					w.WriteHeader(http.StatusOK)
					json.NewEncoder(w).Encode(&Release{
						TagName: "v2.0.0",
						Body:    "Release notes",
						HTMLURL: "https://example.com",
						Assets: []Asset{
							{
								Name:               getAssetNameForPlatform(),
								URL:                "https://api.github.com/repos/test-owner/test-repo/releases/assets/1",
								BrowserDownloadURL: "https://example.com/download",
								Size:               1024,
							},
							{
								Name:               "manifest.json",
								URL:                serverURL + "/releases/assets/manifest",
								BrowserDownloadURL: serverURL + "/releases/assets/manifest",
								Size:               256,
							},
						},
					})
				case "/releases/assets/manifest":
					w.Header().Set("Content-Type", "application/json")
					fmt.Fprintf(w, `{
						"version": "v2.0.0",
						"release_tag": "v2.0.0",
						"generated_at": "2026-08-11T00:00:00Z",
						"artifacts": [
							{"os": "darwin", "arch": "arm64", "filename": "galacius-darwin-arm64.zip", "sha256": "abc123", "size": 1024},
							{"os": "linux", "arch": "amd64", "filename": "galacius-linux-amd64.tar.gz", "sha256": "def456", "size": 1024},
							{"os": "windows", "arch": "amd64", "filename": "galacius-windows-amd64.exe", "sha256": "ghi789", "size": 1024}
						]
					}`)
				default:
					w.WriteHeader(http.StatusNotFound)
				}
			})

			t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)
			t.Setenv("PRIVATE_REPO_ACCESS", tt.privateRepoAccess)

			got, err := Check("v1.0.0", "test-token")
			if err != nil {
				t.Fatalf("Check() returned err=%v, want nil", err)
			}
			if got == nil {
				t.Fatalf("Check() returned nil, want Release")
			}
			if got.AssetURL != tt.wantAssetURL {
				t.Errorf("Check() AssetURL = %q, want %q", got.AssetURL, tt.wantAssetURL)
			}
		})
	}
}

func TestCheckWithToken(t *testing.T) {
	var gotAuth string
	server := httptest.NewServer(http.NewServeMux())
	defer server.Close()
	serverURL := server.URL

	server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/releases/latest" {
			gotAuth = r.Header.Get("Authorization")
			if gotAuth != "Bearer test-token" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(&Release{
				TagName: "v2.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets: []Asset{
					{
						Name:               getAssetNameForPlatform(),
						URL:                serverURL + "/releases/assets/app",
						BrowserDownloadURL: serverURL + "/releases/assets/app",
						Size:               1024,
					},
					{
						Name:               "manifest.json",
						URL:                serverURL + "/releases/assets/manifest",
						BrowserDownloadURL: serverURL + "/releases/assets/manifest",
						Size:               256,
					},
				},
			})
		} else if r.URL.Path == "/releases/assets/manifest" {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{
				"version": "v2.0.0",
				"release_tag": "v2.0.0",
				"generated_at": "2026-08-11T00:00:00Z",
				"artifacts": [
					{"os": "darwin", "arch": "arm64", "filename": "galacius-darwin-arm64.zip", "sha256": "abc123", "size": 1024},
					{"os": "linux", "arch": "amd64", "filename": "galacius-linux-amd64.tar.gz", "sha256": "def456", "size": 1024},
					{"os": "windows", "arch": "amd64", "filename": "galacius-windows-amd64.exe", "sha256": "ghi789", "size": 1024}
				]
			}`)
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	})

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	got, err := Check("v1.0.0", "test-token")
	if err != nil {
		t.Errorf("Check() returned err=%v, want nil", err)
	}
	if gotAuth != "Bearer test-token" {
		t.Errorf("Check() Authorization header = %q, want %q", gotAuth, "Bearer test-token")
	}
	if got == nil {
		t.Errorf("Check with token should return release")
	}
	if got != nil && got.TagName != "v2.0.0" {
		t.Errorf("Check() TagName = %q, want v2.0.0", got.TagName)
	}
}

func TestFetchRelease(t *testing.T) {
	tests := []struct {
		name           string
		tag            string
		serverResponse *Release
		serverStatus   int
		wantErr        bool
	}{
		{
			name:    "tag without v prefix is prefixed",
			tag:     "1.0.0",
			wantErr: false,
			serverResponse: &Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets:  []Asset{},
			},
			serverStatus: http.StatusOK,
		},
		{
			name:    "tag with v prefix",
			tag:     "v1.0.0",
			wantErr: false,
			serverResponse: &Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets:  []Asset{},
			},
			serverStatus: http.StatusOK,
		},
		{
			name:    "server error returns error",
			tag:     "v1.0.0",
			wantErr: true,
			serverResponse: &Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets:  []Asset{},
			},
			serverStatus: http.StatusInternalServerError,
		},
		{
			name:         "not found returns error",
			tag:          "v99.0.0",
			wantErr:      true,
			serverStatus: http.StatusNotFound,
		},
		{
			name:    "release with multiple assets",
			tag:     "v1.0.0",
			wantErr: false,
			serverResponse: &Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets: []Asset{
					{
						Name:               "galacius-other-platform-decoy",
						URL:                "https://api.github.com/repos/galacius/galacius/releases/assets/1",
						BrowserDownloadURL: "https://example.com/decoy",
						Size:               2048,
					},
					{
						Name:               fmt.Sprintf("galacius-%s-%s", goruntime.GOOS, goruntime.GOARCH),
						URL:                "https://api.github.com/repos/galacius/galacius/releases/assets/2",
						BrowserDownloadURL: "https://example.com/match",
						Size:               1024,
					},
				},
			},
			serverStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.NewServeMux())
			serverURL := server.URL
			defer server.Close()

			server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				expectedTag := tt.tag
				if len(tt.tag) > 0 && tt.tag[0] != 'v' {
					expectedTag = "v" + tt.tag
				}
				expectedPath := fmt.Sprintf("/releases/tags/%s", expectedTag)

				switch r.URL.Path {
				case expectedPath:
					w.WriteHeader(tt.serverStatus)
					if tt.serverResponse != nil && tt.serverStatus == http.StatusOK {
						resp := *tt.serverResponse
						resp.Assets = make([]Asset, len(tt.serverResponse.Assets))
						copy(resp.Assets, tt.serverResponse.Assets)
						// Fix asset names to match manifest filenames
						hasPlatformAsset := false
						for i := range resp.Assets {
							if strings.Contains(resp.Assets[i].Name, goruntime.GOOS) && strings.Contains(resp.Assets[i].Name, goruntime.GOARCH) {
								resp.Assets[i].Name = getAssetNameForPlatform()
								hasPlatformAsset = true
							}
						}
						// If no platform asset in test data, add one
						if !hasPlatformAsset && len(resp.Assets) == 0 {
							resp.Assets = append(resp.Assets, Asset{
								Name:               getAssetNameForPlatform(),
								URL:                serverURL + "/releases/assets/app",
								BrowserDownloadURL: serverURL + "/releases/assets/app",
								Size:               1024,
							})
						}
						resp.Assets = append(resp.Assets, Asset{
							Name:               "manifest.json",
							URL:                serverURL + "/releases/assets/manifest",
							BrowserDownloadURL: serverURL + "/releases/assets/manifest",
							Size:               256,
						})
						json.NewEncoder(w).Encode(resp)
					}
				case "/releases/assets/manifest":
					w.Header().Set("Content-Type", "application/json")
					fmt.Fprintf(w, `{
						"version": "v1.0.0",
						"release_tag": "v1.0.0",
						"generated_at": "2026-08-11T00:00:00Z",
						"artifacts": [
							{"os": "darwin", "arch": "arm64", "filename": "galacius-darwin-arm64.zip", "sha256": "abc123", "size": 1024},
							{"os": "linux", "arch": "amd64", "filename": "galacius-linux-amd64.tar.gz", "sha256": "def456", "size": 1024},
							{"os": "windows", "arch": "amd64", "filename": "galacius-windows-amd64.exe", "sha256": "ghi789", "size": 1024},
							{"os": "linux", "arch": "arm64", "filename": "galacius-linux-arm64.tar.gz", "sha256": "jkl012", "size": 1024}
						]
					}`)
				default:
					w.WriteHeader(http.StatusNotFound)
				}
			})

			t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

			got, err := FetchRelease(tt.tag, "test-token")
			if (err != nil) != tt.wantErr {
				t.Errorf("FetchRelease(%q, token): got err=%v, wantErr=%v", tt.tag, err, tt.wantErr)
			}

			if !tt.wantErr && got == nil {
				t.Errorf("FetchRelease(%q, token): got nil, want Release", tt.tag)
			}
			if !tt.wantErr && got != nil && tt.serverResponse != nil && len(tt.serverResponse.Assets) > 0 {
				if got.AssetURL == "" {
					t.Errorf("FetchRelease(%q, token) expected AssetURL to be populated", tt.tag)
				}
				if got.DownloadSize == 0 {
					t.Errorf("FetchRelease(%q, token) expected DownloadSize to be populated", tt.tag)
				}
				if got.SHA256 == "" {
					t.Errorf("FetchRelease(%q, token) expected SHA256 to be populated", tt.tag)
				}
			}
		})
	}
}

func TestFetchReleasePrivateRepoAccess(t *testing.T) {
	tests := []struct {
		name              string
		privateRepoAccess string
		wantAssetURL      string
	}{
		{
			name:              "private repo access enabled uses URL field",
			privateRepoAccess: "true",
			wantAssetURL:      "https://api.github.com/repos/test-owner/test-repo/releases/assets/1",
		},
		{
			name:              "private repo access disabled uses BrowserDownloadURL field",
			privateRepoAccess: "false",
			wantAssetURL:      "https://example.com/download",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.NewServeMux())
			serverURL := server.URL
			defer server.Close()

			// Determine what URLs to use based on private repo access setting
			// The test checks that the correct field (URL or BrowserDownloadURL) is used
			apiURL := "https://api.github.com/repos/test-owner/test-repo/releases/assets/1"
			publicURL := "https://example.com/download"

			server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch r.URL.Path {
				case "/releases/tags/v1.0.0":
					w.WriteHeader(http.StatusOK)
					json.NewEncoder(w).Encode(&Release{
						TagName: "v1.0.0",
						Body:    "Release notes",
						HTMLURL: "https://example.com",
						Assets: []Asset{
							{
								Name:               getAssetNameForPlatform(),
								URL:                apiURL,
								BrowserDownloadURL: publicURL,
								Size:               1024,
							},
							{
								Name:               "manifest.json",
								URL:                serverURL + "/releases/assets/manifest",
								BrowserDownloadURL: serverURL + "/releases/assets/manifest",
								Size:               256,
							},
						},
					})
				case "/releases/assets/manifest":
					w.Header().Set("Content-Type", "application/json")
					fmt.Fprintf(w, `{
						"version": "v1.0.0",
						"release_tag": "v1.0.0",
						"generated_at": "2026-08-11T00:00:00Z",
						"artifacts": [
							{"os": "darwin", "arch": "arm64", "filename": "galacius-darwin-arm64.zip", "sha256": "abc123", "size": 1024},
							{"os": "linux", "arch": "amd64", "filename": "galacius-linux-amd64.tar.gz", "sha256": "def456", "size": 1024},
							{"os": "windows", "arch": "amd64", "filename": "galacius-windows-amd64.exe", "sha256": "ghi789", "size": 1024}
						]
					}`)
				default:
					w.WriteHeader(http.StatusNotFound)
				}
			})

			t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)
			t.Setenv("PRIVATE_REPO_ACCESS", tt.privateRepoAccess)

			got, err := FetchRelease("v1.0.0", "test-token")
			if err != nil {
				t.Fatalf("FetchRelease() returned error: %v", err)
			}
			if got == nil {
				t.Fatalf("FetchRelease() returned nil, want Release")
			}
			if got.AssetURL != tt.wantAssetURL {
				t.Errorf("FetchRelease() AssetURL = %q, want %q", got.AssetURL, tt.wantAssetURL)
			}
		})
	}
}

func TestFetchReleaseWithToken(t *testing.T) {
	var gotAuth string
	server := httptest.NewServer(http.NewServeMux())
	serverURL := server.URL
	defer server.Close()

	server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		if gotAuth != "Bearer test-token" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		switch r.URL.Path {
		case "/releases/tags/v1.0.0":
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(&Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets: []Asset{
					{
						Name:               getAssetNameForPlatform(),
						URL:                serverURL + "/releases/assets/app",
						BrowserDownloadURL: serverURL + "/releases/assets/app",
						Size:               1024,
					},
					{
						Name:               "manifest.json",
						URL:                serverURL + "/releases/assets/manifest",
						BrowserDownloadURL: serverURL + "/releases/assets/manifest",
						Size:               256,
					},
				},
			})
		case "/releases/assets/manifest":
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{
				"version": "v1.0.0",
				"release_tag": "v1.0.0",
				"generated_at": "2026-08-11T00:00:00Z",
				"artifacts": [
					{"os": "darwin", "arch": "arm64", "filename": "galacius-darwin-arm64.zip", "sha256": "abc123", "size": 1024},
					{"os": "linux", "arch": "amd64", "filename": "galacius-linux-amd64.tar.gz", "sha256": "def456", "size": 1024},
					{"os": "windows", "arch": "amd64", "filename": "galacius-windows-amd64.exe", "sha256": "ghi789", "size": 1024}
				]
			}`)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	got, err := FetchRelease("v1.0.0", "test-token")
	if gotAuth != "Bearer test-token" {
		t.Errorf("FetchRelease() Authorization header = %q, want %q", gotAuth, "Bearer test-token")
	}
	if err != nil {
		t.Errorf("FetchRelease with token returned error: %v", err)
	}
	if got == nil {
		t.Errorf("FetchRelease with token should return release")
	}
}

// Test_Check_EdgeCases covers additional edge cases and boundary conditions.
func Test_Check_EdgeCases(t *testing.T) {
	tests := []struct {
		name           string
		current        string
		serverResponse *Release
		serverStatus   int
		wantRelease    bool
		description    string
	}{
		{
			name:        "invalid semver without v prefix",
			current:     "1.2.3",
			wantRelease: false,
			description: "missing v prefix should fail validation",
		},
		{
			name:         "incomplete version is valid shorthand, no matching release",
			current:      "v1.2",
			serverStatus: http.StatusNotFound,
			wantRelease:  false,
			description:  "x/mod/semver accepts \"v1.2\" as valid (implicit .0 patch), so Check reaches the network; a 404 means no release",
		},
		{
			name:        "invalid semver too many segments",
			current:     "v1.2.3.4",
			wantRelease: false,
			description: "too many segments should fail validation",
		},
		{
			name:        "invalid semver non-numeric",
			current:     "v.a.b.c",
			wantRelease: false,
			description: "non-numeric version should fail validation",
		},
		{
			name:        "invalid semver just v prefix",
			current:     "v",
			wantRelease: false,
			description: "bare v prefix should fail validation",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/releases/latest" {
					w.WriteHeader(http.StatusNotFound)
					return
				}
				status := tt.serverStatus
				if status == 0 {
					t.Errorf("test case %q reached the network but sets no serverStatus", tt.name)
					status = http.StatusNotFound
				}
				w.WriteHeader(status)
				if tt.serverResponse != nil && status == http.StatusOK {
					json.NewEncoder(w).Encode(tt.serverResponse)
				}
			}))
			defer server.Close()

			t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

			got, err := Check(tt.current, "test-token")
			if (got != nil) != tt.wantRelease {
				t.Errorf("Check(%q, token): got release=%v, want release=%v (%s)",
					tt.current, got != nil, tt.wantRelease, tt.description)
			}
			// For edge cases, we expect no error on success or no-update cases
			if tt.wantRelease && err != nil {
				t.Errorf("Check(%q, token): got err=%v, want nil (%s)", tt.current, err, tt.description)
			}
		})
	}
}

// Test_Check_MalformedJSON verifies a 200 response with an invalid JSON body
// is treated as a failed check (nil), not a panic or partial decode.
func Test_Check_MalformedJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("{not valid json"))
	}))
	defer server.Close()

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	got, err := Check("v1.0.0", "test-token")
	if got != nil {
		t.Errorf("Check() with malformed JSON body = %v, want nil", got)
	}
	if err == nil {
		t.Errorf("Check() with malformed JSON should return error, got nil")
	}
}

// Test_FetchRelease_EdgeCases covers error cases and status code variations.
func Test_FetchRelease_EdgeCases(t *testing.T) {
	tests := []struct {
		name             string
		tag              string
		serverStatus     int
		wantErr          bool
		wantRateLimitErr bool
		description      string
	}{
		{
			name:             "forbidden status",
			tag:              "v1.0.0",
			serverStatus:     http.StatusForbidden,
			wantErr:          true,
			wantRateLimitErr: true,
			description:      "403 Forbidden should return RateLimitError",
		},
		{
			name:         "service unavailable",
			tag:          "v1.0.0",
			serverStatus: http.StatusServiceUnavailable,
			wantErr:      true,
			description:  "503 Service Unavailable should return error with HTTP status",
		},
		{
			name:         "bad gateway",
			tag:          "v1.0.0",
			serverStatus: http.StatusBadGateway,
			wantErr:      true,
			description:  "502 Bad Gateway should return error with HTTP status",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if tt.serverStatus == http.StatusForbidden {
					// A real GitHub rate-limit 403 always carries this header;
					// set it here so the handler is recognized as rate-limited.
					w.Header().Set("X-RateLimit-Remaining", "0")
				}
				w.WriteHeader(tt.serverStatus)
			}))
			defer server.Close()

			t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

			_, err := FetchRelease(tt.tag, "test-token")
			if (err != nil) != tt.wantErr {
				t.Errorf("FetchRelease(%q, token): got err=%v, wantErr=%v (%s)",
					tt.tag, err != nil, tt.wantErr, tt.description)
			}
			if tt.wantRateLimitErr && err != nil {
				var rateLimitErr *ratelimiter.RateLimitError
				if !errors.As(err, &rateLimitErr) {
					t.Errorf("FetchRelease(%q) expected RateLimitError, got %T: %v", tt.tag, err, err)
				}
			} else if err != nil && !strings.Contains(err.Error(), "HTTP") {
				t.Errorf("FetchRelease error message should contain HTTP status code: %v", err)
			}
		})
	}
}

// TestCheck_RateLimit403 verifies that a 403 response with X-RateLimit-Reset
// header returns a RateLimitError with a parsed reset time.
func TestCheck_RateLimit403(t *testing.T) {
	resetTime := time.Now().Add(1 * time.Hour)
	resetUnix := resetTime.Unix()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/releases/latest" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", resetUnix))
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := Check("v1.0.0", "test-token")
	if err == nil {
		t.Fatalf("Check() with 403 should return error, got nil")
	}

	var rateLimitErr *ratelimiter.RateLimitError
	if !errors.As(err, &rateLimitErr) {
		t.Fatalf("Check() with 403 should return RateLimitError, got %T: %v", err, err)
	}

	// Verify the error message contains something more specific than "HTTP 403"
	if !strings.Contains(rateLimitErr.Message, "rate limit exceeded") {
		t.Errorf("Check() RateLimitError message should mention rate limit, got: %s", rateLimitErr.Message)
	}

	// Verify the reset time was parsed
	if rateLimitErr.ResetTime == nil {
		t.Errorf("Check() RateLimitError should have ResetTime parsed, got nil")
	} else if rateLimitErr.ResetTime.Unix() != resetUnix {
		t.Errorf("Check() RateLimitError ResetTime = %d, want %d", rateLimitErr.ResetTime.Unix(), resetUnix)
	}
}

// TestCheck_RateLimit403NoHeader verifies that a 403 response without
// X-RateLimit-Reset header returns a generic rate-limit message.
func TestCheck_RateLimit403NoHeader(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/releases/latest" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.WriteHeader(http.StatusForbidden)
		// No X-RateLimit-Reset header
	}))
	defer server.Close()

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := Check("v1.0.0", "test-token")
	if err == nil {
		t.Fatalf("Check() with 403 and no header should return error, got nil")
	}

	var rateLimitErr *ratelimiter.RateLimitError
	if !errors.As(err, &rateLimitErr) {
		t.Fatalf("Check() with 403 and no header should return RateLimitError, got %T: %v", err, err)
	}

	// Verify it has the generic message
	if !strings.Contains(rateLimitErr.Message, "rate limit exceeded") {
		t.Errorf("Check() RateLimitError message should mention rate limit, got: %s", rateLimitErr.Message)
	}

	// Verify ResetTime is nil (not parseable)
	if rateLimitErr.ResetTime != nil {
		t.Errorf("Check() RateLimitError with no header should have nil ResetTime, got %v", rateLimitErr.ResetTime)
	}
}

// TestFetchRelease_RateLimit403 verifies that a 403 response in FetchRelease
// returns a RateLimitError.
func TestFetchRelease_RateLimit403(t *testing.T) {
	resetTime := time.Now().Add(30 * time.Minute)
	resetUnix := resetTime.Unix()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/releases/tags/v1.0.0" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", resetUnix))
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := FetchRelease("v1.0.0", "test-token")
	if err == nil {
		t.Fatalf("FetchRelease() with 403 should return error, got nil")
	}

	var rateLimitErr *ratelimiter.RateLimitError
	if !errors.As(err, &rateLimitErr) {
		t.Fatalf("FetchRelease() with 403 should return RateLimitError, got %T: %v", err, err)
	}

	if !strings.Contains(rateLimitErr.Message, "rate limit exceeded") {
		t.Errorf("FetchRelease() RateLimitError message should mention rate limit, got: %s", rateLimitErr.Message)
	}

	if rateLimitErr.ResetTime == nil {
		t.Errorf("FetchRelease() RateLimitError should have ResetTime parsed, got nil")
	}
}

// TestFetchReleaseAuthenticatedManifestNotFound verifies fail-closed behavior
// when manifest.json is missing from the release assets.
func TestFetchReleaseAuthenticatedManifestNotFound(t *testing.T) {
	server := httptest.NewServer(http.NewServeMux())
	serverURL := server.URL
	defer server.Close()

	server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/releases/tags/v1.0.0":
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(&Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets: []Asset{
					{
						Name:               getAssetNameForPlatform(),
						URL:                serverURL + "/releases/assets/app",
						BrowserDownloadURL: serverURL + "/releases/assets/app",
						Size:               1024,
					},
					// Intentionally omit manifest.json
				},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := FetchRelease("v1.0.0", "test-token")
	if err == nil {
		t.Fatalf("FetchRelease() with missing manifest.json should return error, got nil")
	}
	if !strings.Contains(err.Error(), "manifest.json not found") {
		t.Errorf("FetchRelease() error should mention manifest.json not found, got: %v", err)
	}
}

// TestFetchReleaseAuthenticatedManifestFetchFails verifies fail-closed behavior
// when the manifest.json asset fetch returns a non-200 status.
func TestFetchReleaseAuthenticatedManifestFetchFails(t *testing.T) {
	server := httptest.NewServer(http.NewServeMux())
	serverURL := server.URL
	defer server.Close()

	server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/releases/tags/v1.0.0":
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(&Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets: []Asset{
					{
						Name:               getAssetNameForPlatform(),
						URL:                serverURL + "/releases/assets/app",
						BrowserDownloadURL: serverURL + "/releases/assets/app",
						Size:               1024,
					},
					{
						Name:               "manifest.json",
						URL:                serverURL + "/releases/assets/manifest",
						BrowserDownloadURL: serverURL + "/releases/assets/manifest",
						Size:               256,
					},
				},
			})
		case "/releases/assets/manifest":
			w.WriteHeader(http.StatusNotFound)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := FetchRelease("v1.0.0", "test-token")
	if err == nil {
		t.Fatalf("FetchRelease() with manifest.json fetch failing should return error, got nil")
	}
	if !strings.Contains(err.Error(), "fetch manifest") || !strings.Contains(err.Error(), "HTTP") {
		t.Errorf("FetchRelease() error should mention manifest fetch failure, got: %v", err)
	}
}

// TestFetchReleaseAuthenticatedPlatformNotInManifest verifies fail-closed behavior
// when the manifest doesn't list the current platform.
func TestFetchReleaseAuthenticatedPlatformNotInManifest(t *testing.T) {
	server := httptest.NewServer(http.NewServeMux())
	serverURL := server.URL
	defer server.Close()

	server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/releases/tags/v1.0.0":
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(&Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets: []Asset{
					{
						Name:               getAssetNameForPlatform(),
						URL:                serverURL + "/releases/assets/app",
						BrowserDownloadURL: serverURL + "/releases/assets/app",
						Size:               1024,
					},
					{
						Name:               "manifest.json",
						URL:                serverURL + "/releases/assets/manifest",
						BrowserDownloadURL: serverURL + "/releases/assets/manifest",
						Size:               256,
					},
				},
			})
		case "/releases/assets/manifest":
			w.Header().Set("Content-Type", "application/json")
			// Manifest lists only unsupported platforms
			fmt.Fprintf(w, `{
				"version": "v1.0.0",
				"release_tag": "v1.0.0",
				"generated_at": "2026-08-11T00:00:00Z",
				"artifacts": [
					{"os": "freebsd", "arch": "amd64", "filename": "galacius-freebsd-amd64.tar.gz", "sha256": "abc123", "size": 1024}
				]
			}`)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := FetchRelease("v1.0.0", "test-token")
	if err == nil {
		t.Fatalf("FetchRelease() with unsupported platform should return error, got nil")
	}
	if !strings.Contains(err.Error(), "not found in release manifest") {
		t.Errorf("FetchRelease() error should mention platform not found in manifest, got: %v", err)
	}
}

// TestFetchReleaseAuthenticatedArtifactNotInAssets verifies fail-closed behavior
// when the manifest lists an artifact but the resolved filename isn't found in
// the release's Assets list (consistency check).
func TestFetchReleaseAuthenticatedArtifactNotInAssets(t *testing.T) {
	server := httptest.NewServer(http.NewServeMux())
	serverURL := server.URL
	defer server.Close()

	server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/releases/tags/v1.0.0":
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(&Release{
				TagName: "v1.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets: []Asset{
					// Assets list doesn't match the manifest
					{
						Name:               "wrong-filename.tar.gz",
						URL:                serverURL + "/releases/assets/app",
						BrowserDownloadURL: serverURL + "/releases/assets/app",
						Size:               1024,
					},
					{
						Name:               "manifest.json",
						URL:                serverURL + "/releases/assets/manifest",
						BrowserDownloadURL: serverURL + "/releases/assets/manifest",
						Size:               256,
					},
				},
			})
		case "/releases/assets/manifest":
			w.Header().Set("Content-Type", "application/json")
			// Include all platforms so the current platform will be found
			fmt.Fprintf(w, `{
				"version": "v1.0.0",
				"release_tag": "v1.0.0",
				"generated_at": "2026-08-11T00:00:00Z",
				"artifacts": [
					{"os": "darwin", "arch": "arm64", "filename": "galacius-darwin-arm64.zip", "sha256": "abc123", "size": 1024},
					{"os": "linux", "arch": "amd64", "filename": "galacius-linux-amd64.tar.gz", "sha256": "def456", "size": 1024},
					{"os": "windows", "arch": "amd64", "filename": "galacius-windows-amd64.exe", "sha256": "ghi789", "size": 1024}
				]
			}`)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := FetchRelease("v1.0.0", "test-token")
	if err == nil {
		t.Fatalf("FetchRelease() with artifact not in assets should return error, got nil")
	}
	if !strings.Contains(err.Error(), "not found in release assets") {
		t.Errorf("FetchRelease() error should mention artifact not found in assets, got: %v", err)
	}
}

// TestCheckAuthenticatedManifestNotFound mirrors
// TestFetchReleaseAuthenticatedManifestNotFound for the Check() entry point,
// since checkAuthenticated and fetchReleaseAuthenticated independently call
// fetchManifestAuthenticated and must both fail closed the same way.
func TestCheckAuthenticatedManifestNotFound(t *testing.T) {
	server := httptest.NewServer(http.NewServeMux())
	serverURL := server.URL
	defer server.Close()

	server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/releases/latest":
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(&Release{
				TagName: "v2.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets: []Asset{
					{
						Name:               getAssetNameForPlatform(),
						URL:                serverURL + "/releases/assets/app",
						BrowserDownloadURL: serverURL + "/releases/assets/app",
						Size:               1024,
					},
					// Intentionally omit manifest.json
				},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := Check("v1.0.0", "test-token")
	if err == nil {
		t.Fatalf("Check() with missing manifest.json should return error, got nil")
	}
	if !strings.Contains(err.Error(), "manifest.json not found") {
		t.Errorf("Check() error should mention manifest.json not found, got: %v", err)
	}
}

// TestCheckAuthenticatedPlatformNotInManifest mirrors
// TestFetchReleaseAuthenticatedPlatformNotInManifest for the Check() entry point.
func TestCheckAuthenticatedPlatformNotInManifest(t *testing.T) {
	server := httptest.NewServer(http.NewServeMux())
	serverURL := server.URL
	defer server.Close()

	server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/releases/latest":
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(&Release{
				TagName: "v2.0.0",
				Body:    "Release notes",
				HTMLURL: "https://example.com",
				Assets: []Asset{
					{
						Name:               getAssetNameForPlatform(),
						URL:                serverURL + "/releases/assets/app",
						BrowserDownloadURL: serverURL + "/releases/assets/app",
						Size:               1024,
					},
					{
						Name:               "manifest.json",
						URL:                serverURL + "/releases/assets/manifest",
						BrowserDownloadURL: serverURL + "/releases/assets/manifest",
						Size:               256,
					},
				},
			})
		case "/releases/assets/manifest":
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintf(w, `{
				"version": "v2.0.0",
				"release_tag": "v2.0.0",
				"generated_at": "2026-08-11T00:00:00Z",
				"artifacts": [
					{"os": "freebsd", "arch": "amd64", "filename": "galacius-freebsd-amd64.tar.gz", "sha256": "abc123", "size": 1024}
				]
			}`)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := Check("v1.0.0", "test-token")
	if err == nil {
		t.Fatalf("Check() with unsupported platform should return error, got nil")
	}
	if !strings.Contains(err.Error(), "not found in release manifest") {
		t.Errorf("Check() error should mention platform not found in manifest, got: %v", err)
	}
}

// getAssetNameForPlatform returns the manifest filename for the current platform.
func getAssetNameForPlatform() string {
	switch goruntime.GOOS {
	case "darwin":
		return fmt.Sprintf("galacius-%s-%s.zip", goruntime.GOOS, goruntime.GOARCH)
	case "linux":
		return fmt.Sprintf("galacius-%s-%s.tar.gz", goruntime.GOOS, goruntime.GOARCH)
	case "windows":
		return fmt.Sprintf("galacius-%s-%s.exe", goruntime.GOOS, goruntime.GOARCH)
	default:
		return ""
	}
}
