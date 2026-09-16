package plugin

import (
	"io"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// marketplaceLogoURLPattern restricts NewMarketplaceLogoHandler's url query
// param to exactly the shape ReleaseAssets.Lookup's unauthenticated branch
// constructs (see download.go) for a logo asset name (ResolveLogoAssetName):
// https://github.com/<owner>/<repo>/releases/download/<tag>/galacius-plugin-<id>-logo.<ext>.
// Anchoring to this exact shape (rather than accepting arbitrary URLs) is
// what makes proxying safe from SSRF — the handler will only ever fetch a
// public GitHub release asset that looks like a plugin logo.
var marketplaceLogoURLPattern = regexp.MustCompile(
	`^https://github\.com/[\w.-]+/[\w.-]+/releases/download/[^/]+/galacius-plugin-[\w.-]+-logo\.(svg|png|jpe?g)$`,
)

// contentTypeForLogoExt maps the (regex-validated) logo file extension to
// its MIME type. Only the extensions marketplaceLogoURLPattern allows are
// handled; anything else falls back to a generic binary type.
func contentTypeForLogoExt(ext string) string {
	switch strings.ToLower(ext) {
	case ".svg":
		return "image/svg+xml"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	default:
		return "application/octet-stream"
	}
}

// NewMarketplaceLogoHandler proxies a not-yet-installed plugin's marketplace
// logo (a GitHub release asset, from Manifest.LogoURL) so it can be used as
// an <img> src. GitHub serves release assets (via a redirect through
// release-assets.githubusercontent.com) with Content-Disposition: attachment,
// which browsers refuse to render inline as an image — an <img> pointed
// directly at the GitHub URL just hangs. Fetching it server-side with a
// plain http.Client (unaffected by Content-Disposition) and re-serving the
// bytes without that header works around it. Once a plugin is installed,
// its logo is served locally instead via NewPluginAssetHandler.
func NewMarketplaceLogoHandler() http.Handler {
	client := &http.Client{Timeout: 10 * time.Second}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		url := r.URL.Query().Get("url")
		if !marketplaceLogoURLPattern.MatchString(url) {
			http.Error(w, "Invalid logo url", http.StatusBadRequest)
			return
		}

		req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, url, nil)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		resp, err := client.Do(req)
		if err != nil {
			http.Error(w, "Fetching logo failed", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			http.Error(w, "Fetching logo failed", resp.StatusCode)
			return
		}

		// GitHub's release-asset redirect serves everything as
		// application/octet-stream regardless of file type, which some
		// browsers won't render inline as an <img> — infer the real type
		// from the (regex-validated) file extension instead of trusting it.
		w.Header().Set("Content-Type", contentTypeForLogoExt(filepath.Ext(url)))
		w.Header().Set("Cache-Control", "public, max-age=3600")
		w.WriteHeader(http.StatusOK)
		_, _ = io.Copy(w, resp.Body)
	})
}

// NewPluginAssetHandler creates an HTTP handler for serving plugin assets.
// Routes /api/plugins/{pluginID}/* to {resolvePluginDir(pluginID)}/* with
// path-traversal protection. Callers include the "dist/" segment themselves
// (e.g. /api/plugins/helm/dist/index.js), so it must not be added again here
// — doing so previously produced a nonexistent .../dist/dist/index.js path
// and made every plugin bundle 404. resolvePluginDir is called per-request
// (not captured once) and must return the plugin's actual on-disk directory
// rather than assuming {pluginsRootDir}/{pluginID} — the on-disk directory
// name is allowed to differ from the plugin ID (e.g. a local dev build under
// plugins/helm/.output/ with id "helm"; see App.PluginAssetDir).
func NewPluginAssetHandler(resolvePluginDir func(pluginID string) (string, bool)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only handle GET requests for plugin assets
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		path := r.URL.Path
		if !strings.HasPrefix(path, "/api/plugins/") {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}

		// Parse /api/plugins/{pluginID}/path/to/file
		parts := strings.Split(path, "/")
		if len(parts) < 4 || parts[3] == "" {
			http.Error(w, "Invalid plugin path", http.StatusBadRequest)
			return
		}

		pluginID := parts[3]
		relativePath := strings.Join(parts[4:], "/")

		// Build the full disk path
		pluginDistDir, ok := resolvePluginDir(pluginID)
		if !ok {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		fullPath := filepath.Join(pluginDistDir, relativePath)

		// Validate path traversal — ensure resolved path is within dist dir
		// Use filepath.Abs and filepath.Rel to safely check containment
		absPluginDistDir, err := filepath.Abs(pluginDistDir)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		absFullPath, err := filepath.Abs(fullPath)
		if err != nil {
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Check if resolved path is within the dist directory
		relPath, err := filepath.Rel(absPluginDistDir, absFullPath)
		if err != nil || strings.HasPrefix(relPath, "..") {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// Serve the file with appropriate content type
		// Set Content-Type to application/javascript for JS files, otherwise infer
		if strings.HasSuffix(fullPath, ".js") {
			w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		}

		// Use http.ServeFile which handles range requests, etags, etc.
		http.ServeFile(w, r, fullPath)
	})
}
