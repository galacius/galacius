package updater

import (
	"fmt"
	"log"
	"os"

	"github.com/galacius/galacius/internal/config"
	"github.com/galacius/galacius/internal/storage"
)

// getReleasesLatestUrl returns the URL used to resolve the latest release,
// shared by both the authenticated (api.github.com, token present) and
// unauthenticated (github.com redirect, no token) paths — GetReleasesBaseURL
// defaults to the public github.com host and is overridden to
// api.github.com/repos/<owner>/<repo> for private-repo/token access.
func getReleasesLatestUrl() string {
	return config.GetReleasesBaseURL() + "/releases/latest"
}

// getAuthenticatedReleaseTagsUrl returns the api.github.com URL for the
// given release tag, used by the token-present (authenticated) path.
func getAuthenticatedReleaseTagsUrl(tag string) string {
	return fmt.Sprintf("%s/releases/tags/%s", config.GetReleasesBaseURL(), tag)
}

// getUnauthenticatedReleaseTagsUrl returns the github.com HTML URL for the
// given release tag, used by the no-token (unauthenticated) path.
func getUnauthenticatedReleaseTagsUrl(tag string) string {
	return fmt.Sprintf("%s/releases/tag/%s", config.GetReleasesBaseURL(), tag)
}

// getUnauthenticatedReleaseAssetUrl returns the github.com direct download
// URL for the given release tag and asset name, used by the no-token
// (unauthenticated) path.
func getUnauthenticatedReleaseAssetUrl(tag, name string) string {
	return fmt.Sprintf("%s/releases/download/%s/%s", config.GetReleasesBaseURL(), tag, name)
}

// getManifestUrl returns the github.com direct download URL for the
// manifest.json release asset for the given tag, used by the no-token
// (unauthenticated) path as the single source of truth for asset names,
// checksums, and sizes — avoiding per-consumer hardcoded GOOS/GOARCH→filename
// guesses that can drift from the actual build matrix.
func getManifestUrl(tag string) string {
	return fmt.Sprintf("%s/releases/download/%s/manifest.json", config.GetReleasesBaseURL(), tag)
}

// cacheManifest persists the raw manifest.json bytes to ~/.galacius, mirroring
// where scripts/install.sh stores it, so both update paths leave the same
// on-disk artifact behind for inspection/debugging. Best-effort: a write
// failure doesn't fail the update check, since the decoded manifest already
// in memory is all that's actually required.
func cacheManifest(data []byte) {
	if err := os.MkdirAll(storage.Dir(), 0o700); err != nil {
		log.Printf("updater: cache manifest.json: %v", err)
		return
	}
	if err := os.WriteFile(storage.Dir("manifest.json"), data, 0o644); err != nil {
		log.Printf("updater: cache manifest.json: %v", err)
	}
}
