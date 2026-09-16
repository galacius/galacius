package plugin

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/galacius/galacius/packages/core/kube/dto"
)

func TestResolveAssetNames(t *testing.T) {
	tests := []struct {
		name       string
		pluginID   string
		goos       string
		goarch     string
		wantBinary string
		wantBundle string
	}{
		{
			name:       "linux amd64",
			pluginID:   "helm",
			goos:       "linux",
			goarch:     "amd64",
			wantBinary: "galacius-plugin-helm-linux-amd64",
			wantBundle: "galacius-plugin-helm-frontend.tar.gz",
		},
		{
			name:       "darwin arm64",
			pluginID:   "helm",
			goos:       "darwin",
			goarch:     "arm64",
			wantBinary: "galacius-plugin-helm-darwin-arm64",
			wantBundle: "galacius-plugin-helm-frontend.tar.gz",
		},
		{
			name:       "windows amd64",
			pluginID:   "helm",
			goos:       "windows",
			goarch:     "amd64",
			wantBinary: "galacius-plugin-helm-windows-amd64.exe",
			wantBundle: "galacius-plugin-helm-frontend.tar.gz",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			binary, bundle := ResolveAssetNames(tt.pluginID, tt.goos, tt.goarch)
			if binary != tt.wantBinary {
				t.Errorf("binary = %q; want %q", binary, tt.wantBinary)
			}
			if bundle != tt.wantBundle {
				t.Errorf("bundle = %q; want %q", bundle, tt.wantBundle)
			}
		})
	}
}

func TestIsPlatformSupported(t *testing.T) {
	tests := []struct {
		name          string
		manifest      *dto.Manifest
		goos          string
		goarch        string
		wantSupported bool
	}{
		{
			name: "supported linux amd64",
			manifest: &dto.Manifest{
				OS: map[string][]string{
					"linux":   {"amd64", "arm64"},
					"darwin":  {"arm64"},
					"windows": {"amd64"},
				},
			},
			goos:          "linux",
			goarch:        "amd64",
			wantSupported: true,
		},
		{
			name: "unsupported arch",
			manifest: &dto.Manifest{
				OS: map[string][]string{
					"linux": {"amd64"},
				},
			},
			goos:          "linux",
			goarch:        "arm64",
			wantSupported: false,
		},
		{
			name: "unsupported os",
			manifest: &dto.Manifest{
				OS: map[string][]string{
					"linux": {"amd64"},
				},
			},
			goos:          "darwin",
			goarch:        "arm64",
			wantSupported: false,
		},
		{
			name:          "nil os map",
			manifest:      &dto.Manifest{OS: nil},
			goos:          "linux",
			goarch:        "amd64",
			wantSupported: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsPlatformSupported(tt.manifest, tt.goos, tt.goarch)
			if result != tt.wantSupported {
				t.Errorf("IsPlatformSupported() = %v; want %v", result, tt.wantSupported)
			}
		})
	}
}

func TestIsHostVersionCompatible(t *testing.T) {
	tests := []struct {
		name           string
		hostVersion    string
		minVersion     string
		maxVersion     string
		wantCompatible bool
		wantErr        bool
	}{
		{
			name:           "compatible version within range",
			hostVersion:    "1.2.0",
			minVersion:     "1.0.0",
			maxVersion:     "2.0.0",
			wantCompatible: true,
			wantErr:        false,
		},
		{
			name:           "version below minimum",
			hostVersion:    "0.9.0",
			minVersion:     "1.0.0",
			maxVersion:     "2.0.0",
			wantCompatible: false,
			wantErr:        false,
		},
		{
			name:           "version above maximum",
			hostVersion:    "2.1.0",
			minVersion:     "1.0.0",
			maxVersion:     "2.0.0",
			wantCompatible: false,
			wantErr:        false,
		},
		{
			name:           "dev version always compatible",
			hostVersion:    "dev",
			minVersion:     "1.0.0",
			maxVersion:     "2.0.0",
			wantCompatible: true,
			wantErr:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := IsHostVersionCompatible(tt.hostVersion, tt.minVersion, tt.maxVersion)
			if (err != nil) != tt.wantErr {
				t.Errorf("IsHostVersionCompatible() error = %v; wantErr %v", err, tt.wantErr)
				return
			}
			if result != tt.wantCompatible {
				t.Errorf("IsHostVersionCompatible() = %v; want %v", result, tt.wantCompatible)
			}
		})
	}
}

func TestFetchLatestRelease_PrivateSelectsAPIURL(t *testing.T) {
	ctx := context.Background()

	// Setup a mock HTTP server for /latest endpoint
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/latest" {
			http.Error(w, "Not Found", http.StatusNotFound)
			return
		}

		// Return a release with distinct url and browser_download_url per asset
		release := dto.GitHubRelease{
			TagName: "v1.0.0",
			Assets: []dto.GitHubAsset{
				{
					Name:               "galacius-plugin-helm-manifest.json",
					URL:                "https://api.github.com/repos/test/test/releases/assets/123",
					BrowserDownloadURL: "https://github.com/test/test/releases/download/v1.0.0/galacius-plugin-helm-manifest.json",
				},
				{
					Name:               "galacius-plugin-helm-frontend.tar.gz",
					URL:                "https://api.github.com/repos/test/test/releases/assets/124",
					BrowserDownloadURL: "https://github.com/test/test/releases/download/v1.0.0/galacius-plugin-helm-frontend.tar.gz",
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(release)
	}))
	defer server.Close()

	// Call with private=true; should select asset.URL
	assets, tag, err := FetchLatestRelease(ctx, server.URL, "", true)
	if err != nil {
		t.Fatalf("FetchLatestRelease() error = %v", err)
	}

	if tag != "v1.0.0" {
		t.Errorf("tag = %q; want %q", tag, "v1.0.0")
	}

	// Check manifest URL: must be the API URL, not browser_download_url
	manifestURL, ok := assets.Lookup("galacius-plugin-helm-manifest.json")
	wantManifestURL := "https://api.github.com/repos/test/test/releases/assets/123"
	if !ok {
		t.Errorf("Lookup(manifest) returned ok=false")
	} else if manifestURL != wantManifestURL {
		t.Errorf("assets.Lookup(manifest) = %q; want %q", manifestURL, wantManifestURL)
	}

	// Check bundle URL: must be the API URL, not browser_download_url
	bundleURL, ok := assets.Lookup("galacius-plugin-helm-frontend.tar.gz")
	wantBundleURL := "https://api.github.com/repos/test/test/releases/assets/124"
	if !ok {
		t.Errorf("Lookup(bundle) returned ok=false")
	} else if bundleURL != wantBundleURL {
		t.Errorf("assets.Lookup(bundle) = %q; want %q", bundleURL, wantBundleURL)
	}
}

func TestFetchLatestRelease_PublicSelectsBrowserURL(t *testing.T) {
	ctx := context.Background()

	// Setup a mock HTTP server for /latest endpoint
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/latest" {
			http.Error(w, "Not Found", http.StatusNotFound)
			return
		}

		release := dto.GitHubRelease{
			TagName: "v2.1.0",
			Assets: []dto.GitHubAsset{
				{
					Name:               "galacius-plugin-kustomize-manifest.json",
					URL:                "https://api.github.com/repos/test/test/releases/assets/999",
					BrowserDownloadURL: "https://github.com/test/test/releases/download/v2.1.0/galacius-plugin-kustomize-manifest.json",
				},
				{
					Name:               "galacius-plugin-kustomize-frontend.tar.gz",
					URL:                "https://api.github.com/repos/test/test/releases/assets/1000",
					BrowserDownloadURL: "https://github.com/test/test/releases/download/v2.1.0/galacius-plugin-kustomize-frontend.tar.gz",
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(release)
	}))
	defer server.Close()

	// Call with private=false but a token supplied (e.g. a public repo configured
	// with a token to raise the rate limit): this still goes through the
	// authenticated API path (a token means the unauthenticated redirect path is
	// skipped) and should select asset.BrowserDownloadURL, not asset.URL.
	assets, tag, err := FetchLatestRelease(ctx, server.URL, "test-token", false)
	if err != nil {
		t.Fatalf("FetchLatestRelease() error = %v", err)
	}

	if tag != "v2.1.0" {
		t.Errorf("tag = %q; want %q", tag, "v2.1.0")
	}

	// Check manifest URL: must be the browser download URL, not the API URL
	manifestURL, ok := assets.Lookup("galacius-plugin-kustomize-manifest.json")
	wantManifestURL := "https://github.com/test/test/releases/download/v2.1.0/galacius-plugin-kustomize-manifest.json"
	if !ok {
		t.Errorf("Lookup(manifest) returned ok=false")
	} else if manifestURL != wantManifestURL {
		t.Errorf("assets.Lookup(manifest) = %q; want %q", manifestURL, wantManifestURL)
	}

	// Check bundle URL: must be the browser download URL, not the API URL
	bundleURL, ok := assets.Lookup("galacius-plugin-kustomize-frontend.tar.gz")
	wantBundleURL := "https://github.com/test/test/releases/download/v2.1.0/galacius-plugin-kustomize-frontend.tar.gz"
	if !ok {
		t.Errorf("Lookup(bundle) returned ok=false")
	} else if bundleURL != wantBundleURL {
		t.Errorf("assets.Lookup(bundle) = %q; want %q", bundleURL, wantBundleURL)
	}
}

func TestFetchRelease_PrivateSelectsAPIURL(t *testing.T) {
	ctx := context.Background()

	// Setup a mock HTTP server for /tags/<tag> endpoint
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/tags/v3.5.0" {
			http.Error(w, "Not Found", http.StatusNotFound)
			return
		}

		release := dto.GitHubRelease{
			TagName: "v3.5.0",
			Assets: []dto.GitHubAsset{
				{
					Name:               "galacius-plugin-flux-manifest.json",
					URL:                "https://api.github.com/repos/test/test/releases/assets/555",
					BrowserDownloadURL: "https://github.com/test/test/releases/download/v3.5.0/galacius-plugin-flux-manifest.json",
				},
				{
					Name:               "galacius-plugin-flux-frontend.tar.gz",
					URL:                "https://api.github.com/repos/test/test/releases/assets/556",
					BrowserDownloadURL: "https://github.com/test/test/releases/download/v3.5.0/galacius-plugin-flux-frontend.tar.gz",
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(release)
	}))
	defer server.Close()

	// Call with private=true and a specific tag; should select asset.URL
	assets, tag, err := FetchRelease(ctx, server.URL, "", "v3.5.0", true)
	if err != nil {
		t.Fatalf("FetchRelease() error = %v", err)
	}

	if tag != "v3.5.0" {
		t.Errorf("tag = %q; want %q", tag, "v3.5.0")
	}

	// Check manifest URL: must be the API URL
	manifestURL, ok := assets.Lookup("galacius-plugin-flux-manifest.json")
	wantManifestURL := "https://api.github.com/repos/test/test/releases/assets/555"
	if !ok {
		t.Errorf("Lookup(manifest) returned ok=false")
	} else if manifestURL != wantManifestURL {
		t.Errorf("assets.Lookup(manifest) = %q; want %q", manifestURL, wantManifestURL)
	}

	// Check bundle URL: must be the API URL
	bundleURL, ok := assets.Lookup("galacius-plugin-flux-frontend.tar.gz")
	wantBundleURL := "https://api.github.com/repos/test/test/releases/assets/556"
	if !ok {
		t.Errorf("Lookup(bundle) returned ok=false")
	} else if bundleURL != wantBundleURL {
		t.Errorf("assets.Lookup(bundle) = %q; want %q", bundleURL, wantBundleURL)
	}
}

func TestFetchRelease_PublicSelectsBrowserURL(t *testing.T) {
	ctx := context.Background()

	// Setup a mock HTTP server for /tags/<tag> endpoint
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/tags/v1.2.3" {
			http.Error(w, "Not Found", http.StatusNotFound)
			return
		}

		release := dto.GitHubRelease{
			TagName: "v1.2.3",
			Assets: []dto.GitHubAsset{
				{
					Name:               "galacius-plugin-argocd-manifest.json",
					URL:                "https://api.github.com/repos/test/test/releases/assets/777",
					BrowserDownloadURL: "https://github.com/test/test/releases/download/v1.2.3/galacius-plugin-argocd-manifest.json",
				},
				{
					Name:               "galacius-plugin-argocd-frontend.tar.gz",
					URL:                "https://api.github.com/repos/test/test/releases/assets/778",
					BrowserDownloadURL: "https://github.com/test/test/releases/download/v1.2.3/galacius-plugin-argocd-frontend.tar.gz",
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(release)
	}))
	defer server.Close()

	// Call with private=false, a specific tag, and a token supplied (e.g. a public
	// repo configured with a token): this still goes through the authenticated API
	// path and should select asset.BrowserDownloadURL, not asset.URL.
	assets, tag, err := FetchRelease(ctx, server.URL, "test-token", "v1.2.3", false)
	if err != nil {
		t.Fatalf("FetchRelease() error = %v", err)
	}

	if tag != "v1.2.3" {
		t.Errorf("tag = %q; want %q", tag, "v1.2.3")
	}

	// Check manifest URL: must be the browser download URL
	manifestURL, ok := assets.Lookup("galacius-plugin-argocd-manifest.json")
	wantManifestURL := "https://github.com/test/test/releases/download/v1.2.3/galacius-plugin-argocd-manifest.json"
	if !ok {
		t.Errorf("Lookup(manifest) returned ok=false")
	} else if manifestURL != wantManifestURL {
		t.Errorf("assets.Lookup(manifest) = %q; want %q", manifestURL, wantManifestURL)
	}

	// Check bundle URL: must be the browser download URL
	bundleURL, ok := assets.Lookup("galacius-plugin-argocd-frontend.tar.gz")
	wantBundleURL := "https://github.com/test/test/releases/download/v1.2.3/galacius-plugin-argocd-frontend.tar.gz"
	if !ok {
		t.Errorf("Lookup(bundle) returned ok=false")
	} else if bundleURL != wantBundleURL {
		t.Errorf("assets.Lookup(bundle) = %q; want %q", bundleURL, wantBundleURL)
	}
}

func TestFetchLatestRelease_RateLimitReturnsActionableError(t *testing.T) {
	ctx := context.Background()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.Header().Set("X-RateLimit-Reset", "1700000000")
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"message":"API rate limit exceeded"}`))
	}))
	defer server.Close()

	// Rate limiting only applies to the authenticated API path (a token or
	// private=true); the public/no-token path never hits api.github.com.
	_, _, err := FetchLatestRelease(ctx, server.URL, "test-token", false)
	if err == nil {
		t.Fatal("FetchLatestRelease() error = nil; want rate limit error")
	}
	if !strings.Contains(err.Error(), "rate limit exceeded") {
		t.Errorf("error = %q; want it to mention rate limit exceeded", err.Error())
	}
	if strings.Contains(err.Error(), "status 403") {
		t.Errorf("error = %q; should give actionable rate-limit message, not generic status code", err.Error())
	}
}

func TestFetchLatestRelease_ForbiddenWithoutRateLimitHeaderReturnsGenericError(t *testing.T) {
	ctx := context.Background()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	_, _, err := FetchLatestRelease(ctx, server.URL, "test-token", false)
	if err == nil {
		t.Fatal("FetchLatestRelease() error = nil; want error")
	}
	if !strings.Contains(err.Error(), "HTTP 403") {
		t.Errorf("error = %q; want generic status-code error when not rate-limited", err.Error())
	}
}

// resolveLatestTagUnauthenticated's own behavior (redirect-following,
// tag extraction, missing-tag error) is now owned and tested by
// internal/lib/github_release (ResolveLatestTag); see github_release_test.go there.

func TestFetchLatestRelease_UnauthenticatedPath(t *testing.T) {
	ctx := context.Background()

	// Setup a mock HTTP server that serves GitHub's public releases/latest redirect.
	// With private=false and no token, FetchLatestRelease treats baseURL as a public
	// github.com base directly (no shape detection, no api.github.com fallback) and
	// makes no further request beyond resolving the redirect.
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/releases/latest" {
			http.Redirect(w, r, server.URL+"/releases/tag/v1.5.0", http.StatusMovedPermanently)
			return
		}
		if r.URL.Path == "/releases/tag/v1.5.0" {
			w.WriteHeader(http.StatusOK)
			return
		}
		http.NotFound(w, r)
	}))
	defer server.Close()

	assets, tag, err := FetchLatestRelease(ctx, server.URL, "", false)
	if err != nil {
		t.Fatalf("FetchLatestRelease() error = %v", err)
	}

	if tag != "v1.5.0" {
		t.Errorf("tag = %q; want %q", tag, "v1.5.0")
	}

	// Verify Lookup constructs the deterministic download URL, no API call needed
	url, ok := assets.Lookup("manifest.json")
	if !ok {
		t.Errorf("Lookup(manifest.json) returned ok=false")
	}
	want := server.URL + "/releases/download/v1.5.0/manifest.json"
	if url != want {
		t.Errorf("Lookup(manifest.json) = %q; want %q", url, want)
	}
}

func TestFetchLatestRelease_UnauthenticatedPath_RedirectFailurePropagates(t *testing.T) {
	ctx := context.Background()

	// A public repo (private=false, token="") whose redirect can't be resolved
	// (e.g. an unexpected response shape) should return the error directly —
	// there's no authenticated-API fallback anymore.
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	_, _, err := FetchLatestRelease(ctx, server.URL, "", false)
	if err == nil {
		t.Fatal("FetchLatestRelease() error = nil; want error when redirect resolution fails")
	}
}

func TestFetchRelease_UnauthenticatedPath(t *testing.T) {
	ctx := context.Background()

	// Test that when a specific tag is provided for a public repo without a token,
	// the function returns ReleaseAssets that constructs URLs deterministically
	// without making any API calls to fetch the release.
	assets, tag, err := FetchRelease(ctx, "https://github.com/test/repo", "", "v1.3.2", false)
	if err != nil {
		t.Fatalf("FetchRelease() error = %v", err)
	}

	if tag != "v1.3.2" {
		t.Errorf("tag = %q; want %q", tag, "v1.3.2")
	}

	// The assets should construct URLs on demand without needing any API calls
	url, ok := assets.Lookup("manifest.json")
	if !ok {
		t.Errorf("Lookup(manifest.json) returned ok=false")
	}
	expectedURL := "https://github.com/test/repo/releases/download/v1.3.2/manifest.json"
	if url != expectedURL {
		t.Errorf("Lookup(manifest.json) = %q; want %q", url, expectedURL)
	}

	// Test that Lookup handles asset names as-is (no URL encoding of names, only tags)
	url, ok = assets.Lookup("asset-with-dashes.tar.gz")
	if !ok {
		t.Errorf("Lookup(asset-with-dashes.tar.gz) returned ok=false")
	}
	if !strings.Contains(url, "asset-with-dashes.tar.gz") {
		t.Errorf("Lookup(asset-with-dashes) = %q; want to contain exact asset name", url)
	}
}

func TestReleaseAssets_LookupNotFound(t *testing.T) {
	// Test that Lookup returns ok=false for assets that don't exist
	// when using the map-backed (API) mode
	assets := ReleaseAssets{
		tag:     "v1.0.0",
		fromMap: map[string]string{"existing": "https://example.com/existing"},
	}

	_, ok := assets.Lookup("nonexistent")
	if ok {
		t.Errorf("Lookup(nonexistent) returned ok=true; want false")
	}

	// In unauthenticated mode, Lookup always returns ok=true (GitHub will return 404 if it doesn't exist)
	unauthAssets := ReleaseAssets{
		tag:      "v1.0.0",
		htmlBase: "https://github.com/test/repo",
	}

	_, ok = unauthAssets.Lookup("anything")
	if !ok {
		t.Errorf("Lookup in unauthenticated mode returned ok=false; want true")
	}
}

func TestNormalizeVersion(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"v1.2.3", "1.2.3"},
		{"V1.2.3", "1.2.3"},
		{"1.2.3", "1.2.3"},
		{"v", ""},
		{"", ""},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := NormalizeVersion(tt.input)
			if result != tt.expected {
				t.Errorf("NormalizeVersion(%q) = %q; want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestVerifySHA256(t *testing.T) {
	tests := []struct {
		name      string
		content   string
		hexHash   string
		wantValid bool
	}{
		{
			name:      "valid hash",
			content:   "hello",
			hexHash:   "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
			wantValid: true,
		},
		{
			name:      "valid hash uppercase",
			content:   "hello",
			hexHash:   "2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824",
			wantValid: true,
		},
		{
			name:      "valid hash mixed case",
			content:   "hello",
			hexHash:   "2Cf24Dba5fb0A30e26E83b2ac5B9e29E1b161e5c1Fa7425E73043362938B9824",
			wantValid: true,
		},
		{
			name:      "invalid hash",
			content:   "hello",
			hexHash:   "0000000000000000000000000000000000000000000000000000000000000000",
			wantValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temp file with content
			tmpFile, err := os.CreateTemp("", "verify-test")
			if err != nil {
				t.Fatalf("creating temp file: %v", err)
			}
			defer os.Remove(tmpFile.Name())

			if _, err := tmpFile.WriteString(tt.content); err != nil {
				t.Fatalf("writing temp file: %v", err)
			}
			tmpFile.Close()

			// Test verification
			err = VerifySHA256(tmpFile.Name(), tt.hexHash)
			if (err == nil) != tt.wantValid {
				t.Errorf("VerifySHA256() error = %v; wantValid %v", err, tt.wantValid)
			}
		})
	}
}

func TestManifestUnmarshal(t *testing.T) {
	manifestJSON := []byte(`{
		"id": "helm",
		"name": "Helm",
		"description": "Package manager",
		"version": "1.0.0",
		"repository": "https://github.com/test/repo",
		"homepage": "https://helm.sh",
		"minimumHostVersion": "0.1.0",
		"maximumHostVersion": "999.999.999",
		"os": {
			"linux": ["amd64"],
			"darwin": ["arm64"],
			"windows": ["amd64"]
		},
		"bundle": {
			"sha256": "abc123def456",
			"size": 1000
		},
		"binary": {
			"sha256": "binary-sha256-value",
			"size": 5000
		},
		"binaries": {
			"linux-amd64": {
				"sha256": "linux-sha256-value",
				"size": 5000
			},
			"darwin-arm64": {
				"sha256": "darwin-sha256-value",
				"size": 4500
			},
			"windows-amd64": {
				"sha256": "windows-sha256-value",
				"size": 5500
			}
		},
		"capabilities": ["helm-charts", "helm-releases"]
	}`)

	var manifest dto.Manifest
	if err := json.Unmarshal(manifestJSON, &manifest); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}

	// Verify basic fields
	if manifest.ID != "helm" {
		t.Errorf("manifest.ID = %q; want %q", manifest.ID, "helm")
	}
	if manifest.Name != "Helm" {
		t.Errorf("manifest.Name = %q; want %q", manifest.Name, "Helm")
	}

	// Verify bundle asset
	if manifest.Bundle.SHA256 != "abc123def456" {
		t.Errorf("manifest.Bundle.SHA256 = %q; want %q", manifest.Bundle.SHA256, "abc123def456")
	}

	// Verify binary field
	if manifest.Binary.SHA256 != "binary-sha256-value" {
		t.Errorf("manifest.Binary.SHA256 = %q; want %q", manifest.Binary.SHA256, "binary-sha256-value")
	}

	// Verify binaries map
	if len(manifest.Binaries) != 3 {
		t.Errorf("manifest.Binaries len = %d; want 3", len(manifest.Binaries))
	} else {
		if asset, ok := manifest.Binaries["linux-amd64"]; ok {
			if asset.SHA256 != "linux-sha256-value" {
				t.Errorf("linux-amd64 SHA256 = %q; want %q", asset.SHA256, "linux-sha256-value")
			}
		} else {
			t.Errorf("linux-amd64 not found in binaries map")
		}

		if asset, ok := manifest.Binaries["darwin-arm64"]; ok {
			if asset.SHA256 != "darwin-sha256-value" {
				t.Errorf("darwin-arm64 SHA256 = %q; want %q", asset.SHA256, "darwin-sha256-value")
			}
		}

		if asset, ok := manifest.Binaries["windows-amd64"]; ok {
			if asset.SHA256 != "windows-sha256-value" {
				t.Errorf("windows-amd64 SHA256 = %q; want %q", asset.SHA256, "windows-sha256-value")
			}
		}
	}
}

func TestManifestUnmarshalOldFormatBackwardCompat(t *testing.T) {
	// Test that an old-format manifest (only "binary" field, no "binaries") still works
	manifestJSON := []byte(`{
		"id": "helm",
		"name": "Helm",
		"description": "Package manager",
		"version": "1.0.0",
		"repository": "https://github.com/test/repo",
		"homepage": "https://helm.sh",
		"minimumHostVersion": "0.1.0",
		"maximumHostVersion": "999.999.999",
		"os": {
			"linux": ["amd64"],
			"darwin": ["arm64"],
			"windows": ["amd64"]
		},
		"bundle": {
			"sha256": "abc123def456",
			"size": 1000
		},
		"binary": {
			"sha256": "old-format-binary-sha256",
			"size": 5000
		},
		"capabilities": ["helm-charts"]
	}`)

	var manifest dto.Manifest
	if err := json.Unmarshal(manifestJSON, &manifest); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}

	// Verify binary field is populated
	if manifest.Binary.SHA256 != "old-format-binary-sha256" {
		t.Errorf("manifest.Binary.SHA256 = %q; want %q", manifest.Binary.SHA256, "old-format-binary-sha256")
	}

	// Verify binaries map is empty (not present in JSON)
	if len(manifest.Binaries) > 0 {
		t.Errorf("manifest.Binaries expected nil/empty; got %v", manifest.Binaries)
	}
}

func TestExtractTarGz(t *testing.T) {
	tests := []struct {
		name      string
		setupTar  func(t *testing.T) string // Returns archive path
		wantFiles map[string]string         // filename -> expected content
		wantErr   bool
		errMsg    string
	}{
		{
			name: "valid multi-file archive extracts correctly",
			setupTar: func(t *testing.T) string {
				return createTestTarGz(t, map[string]string{
					"index.js":   "console.log('main');",
					"chunk-1.js": "console.log('chunk1');",
					"chunk-2.js": "console.log('chunk2');",
				})
			},
			wantFiles: map[string]string{
				"index.js":   "console.log('main');",
				"chunk-1.js": "console.log('chunk1');",
				"chunk-2.js": "console.log('chunk2');",
			},
			wantErr: false,
		},
		{
			name: "nested files extract with correct directory structure",
			setupTar: func(t *testing.T) string {
				return createTestTarGz(t, map[string]string{
					"index.js":       "main",
					"subdir/file.js": "nested",
				})
			},
			wantFiles: map[string]string{
				"index.js":       "main",
				"subdir/file.js": "nested",
			},
			wantErr: false,
		},
		{
			name: "path traversal attempt rejected",
			setupTar: func(t *testing.T) string {
				return createTestTarGzWithTraversal(t, "../../etc/passwd")
			},
			wantErr: true,
			errMsg:  "path traversal attack detected",
		},
		{
			name: "symlink entry rejected",
			setupTar: func(t *testing.T) string {
				return createTestTarGzWithSymlink(t)
			},
			wantErr: true,
			errMsg:  "rejecting symlink",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			archivePath := tt.setupTar(t)
			defer os.Remove(archivePath)

			destDir := t.TempDir()

			err := ExtractTarGz(archivePath, destDir)

			if (err != nil) != tt.wantErr {
				t.Errorf("ExtractTarGz() error = %v; wantErr %v", err, tt.wantErr)
				return
			}

			if err != nil && tt.errMsg != "" {
				if !strings.Contains(err.Error(), tt.errMsg) {
					t.Errorf("ExtractTarGz() error = %v; want message containing %q", err, tt.errMsg)
				}
				return
			}

			// Verify extracted files
			if !tt.wantErr {
				for filename, wantContent := range tt.wantFiles {
					path := filepath.Join(destDir, filename)
					actualContent, err := os.ReadFile(path)
					if err != nil {
						t.Errorf("failed to read extracted file %q: %v", filename, err)
						continue
					}
					if string(actualContent) != wantContent {
						t.Errorf("file %q content = %q; want %q", filename, string(actualContent), wantContent)
					}

					// Verify file permissions are 0644
					info, _ := os.Stat(path)
					if info.Mode().Perm() != 0644 {
						t.Errorf("file %q perms = %o; want 0644", filename, info.Mode().Perm())
					}
				}
			}
		})
	}
}

// Helper to create a test tar.gz archive with specified files
func createTestTarGz(t *testing.T, files map[string]string) string {
	archivePath := filepath.Join(t.TempDir(), "test.tar.gz")
	f, err := os.Create(archivePath)
	if err != nil {
		t.Fatalf("creating archive: %v", err)
	}
	defer f.Close()

	gzw := gzip.NewWriter(f)
	defer gzw.Close()

	tw := tar.NewWriter(gzw)
	defer tw.Close()

	for name, content := range files {
		hdr := &tar.Header{
			Name: name,
			Mode: 0644,
			Size: int64(len(content)),
		}
		if err := tw.WriteHeader(hdr); err != nil {
			t.Fatalf("writing tar header: %v", err)
		}
		if _, err := tw.Write([]byte(content)); err != nil {
			t.Fatalf("writing tar content: %v", err)
		}
	}

	return archivePath
}

// Helper to create a tar.gz with a path traversal entry
func createTestTarGzWithTraversal(t *testing.T, traversalPath string) string {
	archivePath := filepath.Join(t.TempDir(), "traversal.tar.gz")
	f, err := os.Create(archivePath)
	if err != nil {
		t.Fatalf("creating archive: %v", err)
	}
	defer f.Close()

	gzw := gzip.NewWriter(f)
	defer gzw.Close()

	tw := tar.NewWriter(gzw)
	defer tw.Close()

	hdr := &tar.Header{
		Name: traversalPath,
		Mode: 0644,
		Size: 4,
	}
	if err := tw.WriteHeader(hdr); err != nil {
		t.Fatalf("writing tar header: %v", err)
	}
	if _, err := tw.Write([]byte("evil")); err != nil {
		t.Fatalf("writing tar content: %v", err)
	}

	return archivePath
}

// Helper to create a tar.gz with a symlink entry
func createTestTarGzWithSymlink(t *testing.T) string {
	archivePath := filepath.Join(t.TempDir(), "symlink.tar.gz")
	f, err := os.Create(archivePath)
	if err != nil {
		t.Fatalf("creating archive: %v", err)
	}
	defer f.Close()

	gzw := gzip.NewWriter(f)
	defer gzw.Close()

	tw := tar.NewWriter(gzw)
	defer tw.Close()

	// Add a regular file first
	hdr := &tar.Header{
		Name: "index.js",
		Mode: 0644,
		Size: 4,
	}
	if err := tw.WriteHeader(hdr); err != nil {
		t.Fatalf("writing tar header: %v", err)
	}
	if _, err := tw.Write([]byte("main")); err != nil {
		t.Fatalf("writing tar content: %v", err)
	}

	// Add a symlink
	symHdr := &tar.Header{
		Name:     "link.js",
		Linkname: "index.js",
		Typeflag: tar.TypeSymlink,
	}
	if err := tw.WriteHeader(symHdr); err != nil {
		t.Fatalf("writing symlink header: %v", err)
	}

	return archivePath
}

func TestExtractPreservesFilePermissions(t *testing.T) {
	// Verify that extracted files have exactly 0644 permissions
	archivePath := createTestTarGz(t, map[string]string{
		"test.js": "content",
	})
	defer os.Remove(archivePath)

	destDir := t.TempDir()

	if err := ExtractTarGz(archivePath, destDir); err != nil {
		t.Fatalf("ExtractTarGz failed: %v", err)
	}

	// Check permissions
	info, err := os.Stat(filepath.Join(destDir, "test.js"))
	if err != nil {
		t.Fatalf("stat extracted file: %v", err)
	}

	if info.Mode().Perm() != 0644 {
		t.Errorf("file perms = %o; want 0644", info.Mode().Perm())
	}
}

// TestDiscoverPluginIDs_InvalidIDsFiltered verifies that DiscoverPluginIDs validates
// plugin IDs from the manifest index using ValidPluginID, excluding invalid IDs.
// This prevents directory traversal and other injection attacks via attacker-controlled
// index entries that don't match the safe plugin ID pattern.
func TestDiscoverPluginIDs_InvalidIDsFiltered(t *testing.T) {
	tests := []struct {
		name       string
		index      *dto.ManifestIndex
		wantIDs    []string
		wantCounts int
	}{
		{
			name: "mixed valid and invalid IDs",
			index: &dto.ManifestIndex{
				ReleaseTag:  "v1.0.0",
				GeneratedAt: "2026-08-21T00:00:00Z",
				Plugins: []dto.Manifest{
					{ID: "helm"},         // valid
					{ID: "../../etc"},    // invalid (path traversal)
					{ID: "flux"},         // valid
					{ID: "my plugin"},    // invalid (space)
					{ID: "kustomize"},    // valid
					{ID: ""},             // invalid (empty)
					{ID: ".app-name"},    // valid (leading dot allowed)
					{ID: "test@command"}, // invalid (@ not allowed)
				},
			},
			wantIDs:    []string{".app-name", "flux", "helm", "kustomize"}, // sorted, valid only
			wantCounts: 4,
		},
		{
			name: "all invalid IDs",
			index: &dto.ManifestIndex{
				Plugins: []dto.Manifest{
					{ID: "../traversal"},
					{ID: "spaces here"},
					{ID: "special!char"},
				},
			},
			wantIDs:    []string{},
			wantCounts: 0,
		},
		{
			name: "all valid IDs",
			index: &dto.ManifestIndex{
				Plugins: []dto.Manifest{
					{ID: "alpha"},
					{ID: "beta-1"},
					{ID: "gamma_2"},
					{ID: ".delta"},
				},
			},
			wantIDs:    []string{".delta", "alpha", "beta-1", "gamma_2"},
			wantCounts: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := DiscoverPluginIDs(tt.index)

			if len(result) != tt.wantCounts {
				t.Errorf("DiscoverPluginIDs() returned %d IDs; want %d", len(result), tt.wantCounts)
			}

			for i, id := range result {
				if i < len(tt.wantIDs) && id != tt.wantIDs[i] {
					t.Errorf("DiscoverPluginIDs()[%d] = %q; want %q", i, id, tt.wantIDs[i])
				}
			}
		})
	}
}
