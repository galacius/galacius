// Package githubrelease provides GitHub-release download primitives shared by
// every consumer that fetches releases/assets from GitHub: the plugin
// installer (internal/plugin), the self-updater (internal/updater), and
// internal/app's OS-specific update installers. It centralizes request
// building, rate-limit-aware response checking, unauthenticated
// latest-tag resolution, and atomic download-to-file.
package githubrelease

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/galacius/galacius/internal/lib/ratelimiter"
)

// UserAgent is sent on every GitHub request issued by this package.
const UserAgent = "galacius-installer/1.0"

// NewAPIRequest builds a GET request for GitHub's REST API
// (api.github.com/...), with the headers the API expects, plus a Bearer
// token when the target repo is private (or a token is otherwise supplied).
func NewAPIRequest(ctx context.Context, url, token string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", UserAgent)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return req, nil
}

// NewAssetRequest builds a GET request for a release asset — either a public
// browser_download_url or an authenticated api.github.com asset URL.
// Private-repo assets require the same Bearer auth as the API endpoints.
func NewAssetRequest(ctx context.Context, url, token string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", UserAgent)
	req.Header.Set("Accept", "application/octet-stream")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return req, nil
}

// CheckAPIResponse turns a non-200 GitHub API response into an error. 429 is
// always treated as a rate-limit response; 403 is treated as a rate limit
// only when GitHub's X-RateLimit-Remaining header confirms it (a bare 403
// can also mean "permission denied", which isn't a rate limit and shouldn't
// be reported as one). Rate-limit errors are built via ratelimiter.BuildError,
// which gives a specific "resets at <time>" message when GitHub supplies
// X-RateLimit-Reset. Any other non-200 status becomes a generic error.
func CheckAPIResponse(resp *http.Response) error {
	if resp.StatusCode == http.StatusOK {
		return nil
	}
	if isRateLimited(resp) {
		return ratelimiter.BuildError(resp)
	}
	return fmt.Errorf("github API returned HTTP %d", resp.StatusCode)
}

func isRateLimited(resp *http.Response) bool {
	if resp.StatusCode == http.StatusTooManyRequests {
		return true
	}
	return resp.StatusCode == http.StatusForbidden && resp.Header.Get("X-RateLimit-Remaining") == "0"
}

// ResolveLatestTag resolves the latest release tag via GitHub's
// unauthenticated releases/latest redirect, which is not subject to the
// api.github.com rate limit. It follows the redirect (the default behavior
// of http.DefaultClient) and extracts the tag from the final URL's
// /releases/tag/{tag} path.
func ResolveLatestTag(ctx context.Context, htmlBase string) (string, error) {
	url := htmlBase + "/releases/latest"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("User-Agent", UserAgent)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("resolve latest release: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("resolve latest release: HTTP %d", resp.StatusCode)
	}

	finalURL := resp.Request.URL.String()
	_, tag, found := strings.Cut(finalURL, "/releases/tag/")
	if !found {
		return "", fmt.Errorf("resolve latest release: could not find tag in resolved URL %q", finalURL)
	}
	if tag == "" {
		return "", fmt.Errorf("resolve latest release: empty tag in resolved URL %q", finalURL)
	}
	return tag, nil
}

// ToFile downloads url to destPath. Parent directories are created as
// needed, and the write is atomic (temp file in the same directory, then
// rename). token is sent as a Bearer header (required for private-repo
// release assets). onProgress is an optional callback that receives
// progress updates as a percentage (0-100); it is never called if nil or if
// resp.ContentLength is unknown (<=0).
func ToFile(ctx context.Context, url, destPath, token string, onProgress func(pct int)) error {
	parentDir := filepath.Dir(destPath)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		return fmt.Errorf("creating directory %q: %w", parentDir, err)
	}

	tempFile := destPath + ".tmp"
	_ = os.Remove(tempFile)

	req, err := NewAssetRequest(ctx, url, token)
	if err != nil {
		return fmt.Errorf("creating download request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("downloading from %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download returned status %d", resp.StatusCode)
	}

	f, err := os.Create(tempFile)
	if err != nil {
		return fmt.Errorf("creating temp file %q: %w", tempFile, err)
	}
	defer f.Close()

	var body io.Reader = resp.Body
	if onProgress != nil && resp.ContentLength > 0 {
		body = &progressReader{
			reader:        resp.Body,
			contentLength: resp.ContentLength,
			onProgress:    onProgress,
		}
	}

	if _, err := io.Copy(f, body); err != nil {
		_ = os.Remove(tempFile)
		return fmt.Errorf("writing to temp file: %w", err)
	}

	if err := f.Close(); err != nil {
		_ = os.Remove(tempFile)
		return fmt.Errorf("closing temp file: %w", err)
	}

	if err := os.Rename(tempFile, destPath); err != nil {
		_ = os.Remove(tempFile)
		return fmt.Errorf("moving temp file to %q: %w", destPath, err)
	}

	return nil
}

// progressReader wraps an io.Reader and tracks progress with callbacks.
// It only calls onProgress when the percentage actually changes to avoid flooding callbacks.
type progressReader struct {
	reader        io.Reader
	contentLength int64
	bytesRead     int64
	lastReported  int
	onProgress    func(pct int)
}

func (pr *progressReader) Read(p []byte) (n int, err error) {
	n, err = pr.reader.Read(p)
	pr.bytesRead += int64(n)

	if pr.contentLength > 0 && pr.onProgress != nil {
		pct := int(pr.bytesRead * 100 / pr.contentLength)
		if pct > pr.lastReported {
			pr.lastReported = pct
			pr.onProgress(pct)
		}
	}

	return n, err
}
