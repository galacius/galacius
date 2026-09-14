package dto

const (
	WindowsGOOS        = "windows"
	PluginMetadataFile = ".plugin-metadata.json"
)

// InstalledPlugin is the status of a single installed (or not-installed) plugin,
// as reported by App.GetInstalledPlugin / App.GetInstalledPlugins. It embeds the
// plugin's full manifest and release info (mirroring PluginMetadata, the on-disk
// record it's read from) alongside live runtime status, so callers don't need a
// separate marketplace lookup to render details for an already-installed plugin.
// Manifest is embedded anonymously so its fields are promoted (and JSON-inlined)
// directly onto InstalledPlugin, same as PluginMetadata.
type InstalledPlugin struct {
	Manifest
	PluginID         string `json:"pluginId"`
	ReleaseTag       string `json:"releaseTag,omitempty"`
	InstalledAt      string `json:"installedAt,omitempty"`
	Status           string `json:"status"`
	Error            string `json:"error,omitempty"`
	Progress         int    `json:"progress"`
	BundleChecksum   string `json:"bundleChecksum,omitempty"`
	InstalledVersion string `json:"installedVersion,omitempty"`
	Size             int64  `json:"size,omitempty"`
}

// MarketplaceResult represents the result of fetching plugin manifests from the marketplace.
// Manifests contains successfully fetched plugin manifests; Errors maps pluginID to error messages
// for plugins whose manifest could not be fetched. A single plugin failure should not blank the
// entire marketplace.
type MarketplaceResult struct {
	Manifests []*Manifest       `json:"manifests"`
	Errors    map[string]string `json:"errors,omitempty"`
}

// ManifestAsset describes download integrity (checksum/size) for a single
// downloadable asset (bundle, binary, or one entry of a multi-binary map).
type ManifestAsset struct {
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size"`
}

// ManifestAssetNames describes the on-disk names a plugin's installed
// binary and extracted bundle directory should use — as opposed to
// ManifestAsset, which describes download integrity (checksum/size).
type ManifestAssetNames struct {
	BinaryName string `json:"binaryName"`
	BundleDir  string `json:"bundleDir"`
	// Logo is the filename of the plugin's logo image (e.g. "helm.svg"),
	// shipped inside the plugin's install directory alongside the binary
	// and bundle dir. Empty when the plugin has no logo. Served over the
	// same /api/plugins/{pluginID}/* asset route as the bundle.
	Logo string `json:"logo,omitempty"`
}

// Manifest is a plugin's release manifest, as published alongside a GitHub
// Release and fetched by the marketplace/installer flow.
type Manifest struct {
	ID                 string                   `json:"id"`
	Name               string                   `json:"name"`
	Description        string                   `json:"description"`
	Version            string                   `json:"version"`
	Repository         string                   `json:"repository"`
	Homepage           string                   `json:"homepage"`
	MinimumHostVersion string                   `json:"minimumHostVersion"`
	MaximumHostVersion string                   `json:"maximumHostVersion"`
	OS                 map[string][]string      `json:"os"`
	Bundle             ManifestAsset            `json:"bundle"`
	Binary             ManifestAsset            `json:"binary"`
	Binaries           map[string]ManifestAsset `json:"binaries,omitempty"`
	Capabilities       []string                 `json:"capabilities"`
	Assets             ManifestAssetNames       `json:"assets"`
	SourceURL          string                   `json:"sourceUrl"`
	// LogoURL is the direct GitHub release download URL for the plugin's logo
	// (resolved from Assets.Logo via the galacius-plugin-<id>-logo.<ext> asset
	// naming convention), populated by the marketplace fetch flow. Unlike the
	// /api/plugins/{pluginID}/* route, it's servable before the plugin is
	// installed, since the logo file doesn't exist on disk until then. Empty
	// when the plugin has no logo.
	LogoURL string `json:"logoUrl,omitempty"`
}

// ManifestIndex is the optional repo-wide manifest.json release asset that
// acts as a fast-path source of truth for available plugins, avoiding
// filename-pattern discovery. Absent in older releases; callers fall back to
// scanning asset filenames for the galacius-plugin-<id>-manifest.json
// convention. Each entry under Plugins is a full Manifest (this asset embeds
// complete plugin metadata directly — it does not merely point at separate
// per-plugin manifest assets). Field names (generated_at/release_tag) match
// the galacius-plugins repo's release-publishing tooling.
type ManifestIndex struct {
	GeneratedAt string     `json:"generated_at"`
	ReleaseTag  string     `json:"release_tag"`
	Plugins     []Manifest `json:"plugins"`
}

// GitHubAsset is a single asset attached to a GitHub Release.
type GitHubAsset struct {
	Name               string `json:"name"`
	URL                string `json:"url"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

// GitHubRelease is the subset of the GitHub Releases API response used by
// the plugin marketplace/installer flow.
type GitHubRelease struct {
	TagName string        `json:"tag_name"`
	Assets  []GitHubAsset `json:"assets"`
}

// PluginStatus enum
type PluginStatus string

const (
	PluginStatusNotInstalled PluginStatus = "NOT_INSTALLED"
	PluginStatusInstalling   PluginStatus = "INSTALLING"
	PluginStatusReady        PluginStatus = "READY"
	PluginStatusCrashed      PluginStatus = "CRASHED"
	PluginStatusIncompatible PluginStatus = "INCOMPATIBLE"
	PluginStatusDisabled     PluginStatus = "DISABLED"
)

func (ps PluginStatus) String() string {
	return string(ps)
}

// PluginLockFile is stored as JSON
type PluginLockFile struct {
	PID       int    `json:"pid"`
	Port      int    `json:"port"` // HTTP backend port (127.0.0.1:<port>)
	Timestamp string `json:"timestamp"` // RFC3339 — MUST be string, not time.Time (Wails limitation)
	Version   string `json:"version"`
}

// PluginMetadata is the on-disk record of an installed plugin, written to
// the plugin's ".plugin-metadata.json" file. It extends Manifest (the
// marketplace listing shape, also matched by the frontend's PluginManifest
// interface) with the two fields specific to a local install: the release
// tag it was installed from and when. Manifest is embedded anonymously so
// its fields are promoted (and JSON-inlined) directly onto PluginMetadata.
type PluginMetadata struct {
	Manifest
	ReleaseTag  string `json:"releaseTag"`
	InstalledAt string `json:"installedAt,omitempty"`
}
