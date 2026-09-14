package updater

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	goruntime "runtime"
	"strings"
	"time"

	"github.com/galacius/galacius/internal/config"
	"github.com/galacius/galacius/internal/lib/github_release"
	"golang.org/x/mod/semver"
)

// fetchManifestAuthenticated finds and downloads the manifest.json release
// asset using the GitHub API's authenticated asset-download convention
// (api.github.com/repos/.../releases/assets/<id> + Bearer token), since
// private-repo release assets aren't reachable via the public
// github.com/.../releases/download/... URL used by the unauthenticated path.
func fetchManifestAuthenticated(ctx context.Context, assets []Asset, token string) (*Manifest, error) {
	var manifestURL string
	for i := range assets {
		if assets[i].Name == "manifest.json" {
			if config.IsPrivateRepoAccess() {
				manifestURL = assets[i].URL
			} else {
				manifestURL = assets[i].BrowserDownloadURL
			}
			break
		}
	}
	if manifestURL == "" {
		return nil, fmt.Errorf("fetch manifest: manifest.json not found in release assets")
	}

	req, err := githubrelease.NewAssetRequest(ctx, manifestURL, token)
	if err != nil {
		return nil, fmt.Errorf("build manifest request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch manifest: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch manifest: HTTP %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read manifest: %w", err)
	}
	cacheManifest(data)

	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, fmt.Errorf("decode manifest: %w", err)
	}
	return &manifest, nil
}

// checkAuthenticated queries the api.github.com REST API for the latest
// release using a Bearer token, mirroring Check's contract: returns
// (nil, nil) if current is already up-to-date, and populates AssetURL/
// DownloadSize from the matching platform asset when a newer release exists.
func checkAuthenticated(current, token string) (*Release, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	url := getReleasesLatestUrl()
	req, err := githubrelease.NewAPIRequest(ctx, url, token)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch latest release: %w", err)
	}
	defer resp.Body.Close()

	if err := githubrelease.CheckAPIResponse(resp); err != nil {
		return nil, fmt.Errorf("fetch latest release: %w", err)
	}

	var rel Release
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return nil, fmt.Errorf("decode release: %w", err)
	}

	latest := rel.TagName
	if !strings.HasPrefix(latest, "v") {
		latest = "v" + latest
	}
	if !semver.IsValid(latest) || semver.Compare(latest, current) <= 0 {
		return nil, nil
	}

	manifest, err := fetchManifestAuthenticated(ctx, rel.Assets, token)
	if err != nil {
		return nil, fmt.Errorf("resolve release asset: %w", err)
	}

	artifact := manifest.FindArtifact(goruntime.GOOS, goruntime.GOARCH)
	if artifact == nil {
		return nil, fmt.Errorf("resolve release asset: current platform %s/%s not found in release manifest", goruntime.GOOS, goruntime.GOARCH)
	}

	// Find the asset in rel.Assets with matching filename and use its URL
	var assetURL string
	for i := range rel.Assets {
		if rel.Assets[i].Name == artifact.Filename {
			if config.IsPrivateRepoAccess() {
				assetURL = rel.Assets[i].URL
			} else {
				assetURL = rel.Assets[i].BrowserDownloadURL
			}
			break
		}
	}
	if assetURL == "" {
		return nil, fmt.Errorf("resolve release asset: artifact %q not found in release assets", artifact.Filename)
	}

	rel.AssetURL = assetURL
	rel.DownloadSize = artifact.Size
	rel.SHA256 = artifact.SHA256

	return &rel, nil
}

// fetchReleaseAuthenticated returns the named release from the api.github.com
// REST API using a Bearer token, with its platform asset resolved.
func fetchReleaseAuthenticated(tag, token string) (*Release, error) {
	url := getAuthenticatedReleaseTagsUrl(tag)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := githubrelease.NewAPIRequest(ctx, url, token)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch release: %w", err)
	}
	defer resp.Body.Close()
	if err := githubrelease.CheckAPIResponse(resp); err != nil {
		return nil, err
	}

	var rel Release
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return nil, fmt.Errorf("decode release: %w", err)
	}

	manifest, err := fetchManifestAuthenticated(ctx, rel.Assets, token)
	if err != nil {
		return nil, fmt.Errorf("resolve release asset: %w", err)
	}

	artifact := manifest.FindArtifact(goruntime.GOOS, goruntime.GOARCH)
	if artifact == nil {
		return nil, fmt.Errorf("resolve release asset: current platform %s/%s not found in release manifest", goruntime.GOOS, goruntime.GOARCH)
	}

	// Find the asset in rel.Assets with matching filename and use its URL
	var assetURL string
	for i := range rel.Assets {
		if rel.Assets[i].Name == artifact.Filename {
			if config.IsPrivateRepoAccess() {
				assetURL = rel.Assets[i].URL
			} else {
				assetURL = rel.Assets[i].BrowserDownloadURL
			}
			break
		}
	}
	if assetURL == "" {
		return nil, fmt.Errorf("resolve release asset: artifact %q not found in release assets", artifact.Filename)
	}

	rel.AssetURL = assetURL
	rel.DownloadSize = artifact.Size
	rel.SHA256 = artifact.SHA256

	return &rel, nil
}
