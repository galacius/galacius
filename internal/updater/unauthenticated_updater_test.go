package updater

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestCheck_NoToken_UnauthenticatedPath verifies that Check with an empty
// token resolves the latest release entirely via the public github.com
// redirect/download convention and never touches an api.github.com-shaped
// endpoint (mirrors scripts/install.sh's unauthenticated path).
func TestCheck_NoToken_UnauthenticatedPath(t *testing.T) {
	tests := []struct {
		name        string
		current     string
		latestTag   string
		wantRelease bool
	}{
		{name: "newer release available", current: "v1.0.0", latestTag: "v9.9.9", wantRelease: true},
		{name: "already up to date", current: "v9.9.9", latestTag: "v9.9.9", wantRelease: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var apiHit bool
			mux := http.NewServeMux()
			mux.HandleFunc("/repos/", func(w http.ResponseWriter, r *http.Request) {
				apiHit = true
				w.WriteHeader(http.StatusInternalServerError)
			})
			mux.HandleFunc("/releases/latest", func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, "/releases/tag/"+tt.latestTag, http.StatusFound)
			})
			mux.HandleFunc("/releases/tag/", func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})
			mux.HandleFunc("/releases/download/", func(w http.ResponseWriter, r *http.Request) {
				// Serve manifest.json for this test
				if strings.Contains(r.URL.Path, "manifest.json") {
					w.Header().Set("Content-Type", "application/json")
					fmt.Fprintf(w, `{
						"version": "%s",
						"release_tag": "%s",
						"generated_at": "2026-08-11T00:00:00Z",
						"artifacts": [
							{"os": "darwin", "arch": "arm64", "filename": "galacius-darwin-arm64.zip", "sha256": "abc123", "size": 2048},
							{"os": "linux", "arch": "amd64", "filename": "galacius-linux-amd64.tar.gz", "sha256": "def456", "size": 2048},
							{"os": "windows", "arch": "amd64", "filename": "galacius-windows-amd64.exe", "sha256": "ghi789", "size": 2048}
						]
					}`, tt.latestTag, tt.latestTag)
				} else {
					w.Header().Set("Content-Length", "2048")
					w.WriteHeader(http.StatusOK)
				}
			})
			server := httptest.NewServer(mux)
			defer server.Close()

			t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

			got, err := Check(tt.current, "")
			if err != nil {
				t.Fatalf("Check() returned err=%v, want nil", err)
			}
			if apiHit {
				t.Fatalf("Check() with no token must never call the api.github.com-shaped path")
			}
			if (got != nil) != tt.wantRelease {
				t.Fatalf("Check(): got release=%v, want release=%v", got != nil, tt.wantRelease)
			}
			if got != nil {
				expectedSize := int64(2048)
				if got.DownloadSize != expectedSize {
					t.Errorf("Check() DownloadSize = %d, want %d", got.DownloadSize, expectedSize)
				}
				if got.TagName != tt.latestTag {
					t.Errorf("Check() TagName = %q, want %q", got.TagName, tt.latestTag)
				}
			}
		})
	}
}

// TestFetchRelease_NoToken_UnauthenticatedPath verifies FetchRelease with an
// empty token builds the Release entirely from public URLs for the given
// tag, without any api.github.com-shaped request.
func TestFetchRelease_NoToken_UnauthenticatedPath(t *testing.T) {
	var apiHit bool
	mux := http.NewServeMux()
	mux.HandleFunc("/repos/", func(w http.ResponseWriter, r *http.Request) {
		apiHit = true
		w.WriteHeader(http.StatusInternalServerError)
	})
	mux.HandleFunc("/releases/download/", func(w http.ResponseWriter, r *http.Request) {
		// Serve manifest.json for this test
		if strings.Contains(r.URL.Path, "manifest.json") {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, `{
				"version": "v3.4.5",
				"release_tag": "v3.4.5",
				"generated_at": "2026-08-11T00:00:00Z",
				"artifacts": [
					{"os": "darwin", "arch": "arm64", "filename": "galacius-darwin-arm64.zip", "sha256": "abc123", "size": 4096},
					{"os": "linux", "arch": "amd64", "filename": "galacius-linux-amd64.tar.gz", "sha256": "def456", "size": 4096},
					{"os": "windows", "arch": "amd64", "filename": "galacius-windows-amd64.exe", "sha256": "ghi789", "size": 4096}
				]
			}`)
		} else {
			w.Header().Set("Content-Length", "4096")
			w.WriteHeader(http.StatusOK)
		}
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	got, err := FetchRelease("v3.4.5", "")
	if err != nil {
		t.Fatalf("FetchRelease() returned err=%v, want nil", err)
	}
	if apiHit {
		t.Fatalf("FetchRelease() with no token must never call the api.github.com-shaped path")
	}
	if got == nil {
		t.Fatalf("FetchRelease() returned nil, want Release")
	}
	if got.TagName != "v3.4.5" {
		t.Errorf("FetchRelease() TagName = %q, want v3.4.5", got.TagName)
	}
	if got.DownloadSize != 4096 {
		t.Errorf("FetchRelease() DownloadSize = %d, want 4096", got.DownloadSize)
	}
}

func TestFetchManifest_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/releases/download/v1.2.3/manifest.json", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{
			"version": "v1.2.3",
			"release_tag": "v1.2.3",
			"generated_at": "2026-08-11T00:00:00Z",
			"artifacts": [
				{"os": "darwin", "arch": "arm64", "filename": "galacius-darwin-arm64.zip", "sha256": "abc123", "size": 1024},
				{"os": "linux", "arch": "amd64", "filename": "galacius-linux-amd64.tar.gz", "sha256": "def456", "size": 2048},
				{"os": "windows", "arch": "amd64", "filename": "galacius-windows-amd64.exe", "sha256": "ghi789", "size": 3072}
			]
		}`)
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	got, err := fetchManifest("v1.2.3")
	if err != nil {
		t.Fatalf("fetchManifest() returned err=%v, want nil", err)
	}
	if got == nil {
		t.Fatalf("fetchManifest() returned nil, want Manifest")
	}
	if got.Version != "v1.2.3" {
		t.Errorf("fetchManifest() Version = %q, want v1.2.3", got.Version)
	}
	if len(got.Artifacts) != 3 {
		t.Errorf("fetchManifest() Artifacts length = %d, want 3", len(got.Artifacts))
	}
}

func TestFetchManifest_404(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := fetchManifest("v1.2.3")
	if err == nil {
		t.Fatal("fetchManifest() expected error for 404, got nil")
	}
	if !strings.Contains(err.Error(), "HTTP 404") {
		t.Errorf("fetchManifest() error = %q, want HTTP 404", err.Error())
	}
}

func TestFetchManifest_MalformedJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{invalid json`)
	}))
	defer server.Close()

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := fetchManifest("v1.2.3")
	if err == nil {
		t.Fatal("fetchManifest() expected error for malformed JSON, got nil")
	}
	if !strings.Contains(err.Error(), "decode manifest") {
		t.Errorf("fetchManifest() error = %q, want decode manifest error", err.Error())
	}
}

func TestManifest_FindArtifact_Found(t *testing.T) {
	m := &Manifest{
		Artifacts: []ManifestArtifact{
			{OS: "darwin", Arch: "arm64", Filename: "galacius-darwin-arm64.zip"},
			{OS: "linux", Arch: "amd64", Filename: "galacius-linux-amd64.tar.gz"},
			{OS: "windows", Arch: "amd64", Filename: "galacius-windows-amd64.exe"},
		},
	}

	tests := []struct {
		goos, goarch, wantFilename string
	}{
		{"darwin", "arm64", "galacius-darwin-arm64.zip"},
		{"linux", "amd64", "galacius-linux-amd64.tar.gz"},
		{"windows", "amd64", "galacius-windows-amd64.exe"},
	}

	for _, tt := range tests {
		t.Run(tt.goos+"/"+tt.goarch, func(t *testing.T) {
			got := m.FindArtifact(tt.goos, tt.goarch)
			if got == nil {
				t.Fatalf("FindArtifact(%q, %q) returned nil, want artifact", tt.goos, tt.goarch)
			}
			if got.Filename != tt.wantFilename {
				t.Errorf("FindArtifact(%q, %q) Filename = %q, want %q", tt.goos, tt.goarch, got.Filename, tt.wantFilename)
			}
		})
	}
}

func TestManifest_FindArtifact_NotFound(t *testing.T) {
	m := &Manifest{
		Artifacts: []ManifestArtifact{
			{OS: "darwin", Arch: "arm64", Filename: "galacius-darwin-arm64.zip"},
		},
	}

	got := m.FindArtifact("linux", "arm64")
	if got != nil {
		t.Errorf("FindArtifact(linux, arm64) returned %v, want nil", got)
	}
}

func TestUnauthenticatedRelease_PlatformNotFound(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/releases/download/v1.2.3/manifest.json", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// Manifest with no matching platform for the test
		fmt.Fprint(w, `{
			"version": "v1.2.3",
			"release_tag": "v1.2.3",
			"generated_at": "2026-08-11T00:00:00Z",
			"artifacts": [
				{"os": "freebsd", "arch": "amd64", "filename": "galacius-freebsd-amd64.tar.gz", "sha256": "xyz", "size": 1024}
			]
		}`)
	})
	server := httptest.NewServer(mux)
	defer server.Close()

	t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

	_, err := unauthenticatedRelease("v1.2.3")
	if err == nil {
		t.Fatalf("unauthenticatedRelease() expected error when platform not found, got nil")
	}
	if !strings.Contains(err.Error(), "not found in release manifest") {
		t.Errorf("unauthenticatedRelease() error = %q, want platform not found message", err.Error())
	}
}

func TestResolveLatestTagUnauthenticated(t *testing.T) {
	t.Run("resolves tag from redirect", func(t *testing.T) {
		mux := http.NewServeMux()
		mux.HandleFunc("/releases/latest", func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/releases/tag/v7.8.9", http.StatusFound)
		})
		mux.HandleFunc("/releases/tag/v7.8.9", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})
		server := httptest.NewServer(mux)
		defer server.Close()

		t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

		tag, err := resolveLatestTagUnauthenticated()
		if err != nil {
			t.Fatalf("resolveLatestTagUnauthenticated() returned err=%v", err)
		}
		if tag != "v7.8.9" {
			t.Errorf("resolveLatestTagUnauthenticated() = %q, want v7.8.9", tag)
		}
	})

	t.Run("non-200 final status returns error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
		}))
		defer server.Close()

		t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

		_, err := resolveLatestTagUnauthenticated()
		if err == nil {
			t.Fatal("resolveLatestTagUnauthenticated() expected error for non-200 status, got nil")
		}
	})

	t.Run("no tag segment in resolved URL returns error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))
		defer server.Close()

		t.Setenv("APP_VERSION_RELEASES_BASE_URL", server.URL)

		_, err := resolveLatestTagUnauthenticated()
		if err == nil {
			t.Fatal("resolveLatestTagUnauthenticated() expected error when no /releases/tag/ segment present, got nil")
		}
	})
}
