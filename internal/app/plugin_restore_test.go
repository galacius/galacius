package app

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/galacius/galacius/packages/core/kube/dto"
)

// TestRestoreInstalledPluginsValidMetadata verifies a plugin with valid .plugin-metadata.json
// containing a proper id field, valid bundle checksum, and valid binary is restored.
func TestRestoreInstalledPluginsValidMetadata(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	// Use a directory name that differs from the plugin ID to prove metadata ID wins
	dirName := "myplugin-dir"
	pluginID := "helm" // The actual identity comes from metadata.ID

	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", dirName)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create valid binary using the plugin-{pluginID} convention (which metadata will default to)
	binaryName := "plugin-" + pluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary content"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// Create valid metadata with a different ID than directory name
	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
		ReleaseTag:  "v1.0.0",
		InstalledAt: "2026-01-01T00:00:00Z",
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		t.Fatalf("failed to marshal metadata: %v", err)
	}
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: loader should be keyed by metadata.ID (pluginID), not directory name
	app.pluginsMu.RLock()
	loader, exists := app.pluginLoaders[pluginID]
	_, dirNameExists := app.pluginLoaders[dirName]
	app.pluginsMu.RUnlock()

	if !exists {
		t.Errorf("expected loader for plugin ID %q to exist, but it does not", pluginID)
	}
	if dirNameExists {
		t.Errorf("expected NO loader for directory name %q, but found one (directory name should not be used as identity)", dirName)
	}

	// Verify loader is marked READY
	if loader != nil && loader.Status() != dto.PluginStatusReady {
		t.Errorf("expected loader status to be READY, got %s", loader.Status())
	}
}

// TestRestoreInstalledPluginsMissingMetadataID verifies a plugin with .plugin-metadata.json
// missing the id field (empty string) is skipped.
func TestRestoreInstalledPluginsMissingMetadataID(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	app := NewApp("test")

	dirName := "no-id-plugin"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", dirName)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create valid binary
	binaryName := "plugin-" + dirName
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// Create metadata WITHOUT id field (empty string)
	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      "", // Empty ID
			Name:    "Plugin Without ID",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		t.Fatalf("failed to marshal metadata: %v", err)
	}
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: no loader created (directory skipped)
	app.pluginsMu.RLock()
	count := len(app.pluginLoaders)
	app.pluginsMu.RUnlock()

	if count != 0 {
		t.Errorf("expected no loaders (plugin should be skipped), but found %d", count)
	}
}

// TestRestoreInstalledPluginsNoMetadataFile verifies a plugin directory with no
// .plugin-metadata.json file at all is skipped.
func TestRestoreInstalledPluginsNoMetadataFile(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	app := NewApp("test")

	dirName := "no-metadata-file"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", dirName)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create valid binary
	binaryName := "plugin-" + dirName
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// DO NOT create metadata file

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: no loader created (directory skipped due to missing metadata)
	app.pluginsMu.RLock()
	count := len(app.pluginLoaders)
	app.pluginsMu.RUnlock()

	if count != 0 {
		t.Errorf("expected no loaders (plugin should be skipped), but found %d", count)
	}
}

// TestRestoreInstalledPluginsFlatSchemaMetadata verifies a plugin with old flat-schema metadata
// (bare bundleSha256, no nested bundle.sha256, no id) is skipped (no migration).
func TestRestoreInstalledPluginsFlatSchemaMetadata(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	app := NewApp("test")

	dirName := "flat-schema-plugin"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", dirName)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create valid binary
	binaryName := "plugin-" + dirName
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// Create metadata in OLD flat schema (bare bundleSha256, no id field)
	flatMetadata := map[string]interface{}{
		"releaseTag":   "v1.0.0",
		"bundleSha256": "0000000000000000000000000000000000000000000000000000000000000000",
		"installedAt":  "2026-01-01T00:00:00Z",
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, err := json.Marshal(flatMetadata)
	if err != nil {
		t.Fatalf("failed to marshal metadata: %v", err)
	}
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: no loader created (flat schema rejected, no migration)
	app.pluginsMu.RLock()
	count := len(app.pluginLoaders)
	app.pluginsMu.RUnlock()

	if count != 0 {
		t.Errorf("expected no loaders (flat schema should not be migrated), but found %d", count)
	}
}

// TestRestoreInstalledPluginsLegacyBundleSha256File verifies a plugin with only
// legacy .bundle-sha256 file (no JSON metadata) is skipped.
func TestRestoreInstalledPluginsLegacyBundleSha256File(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	app := NewApp("test")

	dirName := "legacy-checksum-plugin"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", dirName)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create valid binary
	binaryName := "plugin-" + dirName
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// Create legacy .bundle-sha256 file instead of JSON metadata
	legacyChecksumPath := filepath.Join(pluginDir, ".bundle-sha256")
	if err := os.WriteFile(legacyChecksumPath, []byte("0000000000000000000000000000000000000000000000000000000000000000"), 0644); err != nil {
		t.Fatalf("failed to write legacy checksum file: %v", err)
	}

	// DO NOT create .plugin-metadata.json

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: no loader created (legacy format without metadata.json is skipped)
	app.pluginsMu.RLock()
	count := len(app.pluginLoaders)
	app.pluginsMu.RUnlock()

	if count != 0 {
		t.Errorf("expected no loaders (legacy .bundle-sha256-only should be skipped), but found %d", count)
	}
}

// TestRestoreInstalledPluginsInvalidBundleChecksum verifies a plugin with valid metadata
// but invalid bundle checksum format is skipped.
func TestRestoreInstalledPluginsInvalidBundleChecksum(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	app := NewApp("test")

	dirName := "bad-checksum-plugin"
	pluginID := "bad-checksum"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", dirName)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create valid binary
	binaryName := "plugin-" + dirName
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// Create metadata with INVALID checksum
	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Bad Checksum Plugin",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "not-a-valid-hex-checksum", // Invalid
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		t.Fatalf("failed to marshal metadata: %v", err)
	}
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: no loader created (invalid checksum skipped)
	app.pluginsMu.RLock()
	count := len(app.pluginLoaders)
	app.pluginsMu.RUnlock()

	if count != 0 {
		t.Errorf("expected no loaders (invalid checksum should skip), but found %d", count)
	}
}

// TestRestoreInstalledPluginsInvalidPluginID verifies a plugin with metadata.ID
// that fails validPluginID check is skipped.
func TestRestoreInstalledPluginsInvalidPluginID(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	app := NewApp("test")

	dirName := "valid-dir-name"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", dirName)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create valid binary
	binaryName := "plugin-" + dirName
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// Create metadata with INVALID plugin ID (contains special character)
	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      "plugin@invalid!", // Invalid due to special chars
			Name:    "Invalid ID Plugin",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		t.Fatalf("failed to marshal metadata: %v", err)
	}
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: no loader created (invalid ID skipped)
	app.pluginsMu.RLock()
	count := len(app.pluginLoaders)
	app.pluginsMu.RUnlock()

	if count != 0 {
		t.Errorf("expected no loaders (invalid plugin ID should skip), but found %d", count)
	}
}

// TestRestoreInstalledPluginsMissingBinary verifies a plugin with valid metadata
// but missing binary file is skipped.
func TestRestoreInstalledPluginsMissingBinary(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	app := NewApp("test")

	dirName := "no-binary-plugin"
	pluginID := "no-binary"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", dirName)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// DO NOT create binary

	// Create valid metadata
	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "No Binary Plugin",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		t.Fatalf("failed to marshal metadata: %v", err)
	}
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: no loader created (missing binary skipped)
	app.pluginsMu.RLock()
	count := len(app.pluginLoaders)
	app.pluginsMu.RUnlock()

	if count != 0 {
		t.Errorf("expected no loaders (missing binary should skip), but found %d", count)
	}
}

// TestRestoreInstalledPluginsMultiplePlugins verifies restore works correctly
// with multiple plugins, some valid and some invalid.
func TestRestoreInstalledPluginsMultiplePlugins(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	pluginsRoot := filepath.Join(tempHome, ".galacius", "plugins")
	if err := os.MkdirAll(pluginsRoot, 0755); err != nil {
		t.Fatalf("failed to create plugins root: %v", err)
	}

	// Setup: 1 valid plugin
	validDir := "valid-plugin"
	validPluginID := "helm"
	validPath := filepath.Join(pluginsRoot, validDir)
	if err := os.MkdirAll(validPath, 0755); err != nil {
		t.Fatalf("failed to create valid plugin dir: %v", err)
	}
	// Binary name must follow the plugin-{pluginID} convention (which metadata defaults to)
	binaryName := "plugin-" + validPluginID
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	validBinaryPath := filepath.Join(validPath, binaryName)
	if err := os.WriteFile(validBinaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create valid binary: %v", err)
	}
	validMetadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      validPluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
	}
	validMetadataPath := filepath.Join(validPath, ".plugin-metadata.json")
	validMetadataBytes, _ := json.Marshal(validMetadata)
	if err := os.WriteFile(validMetadataPath, validMetadataBytes, 0644); err != nil {
		t.Fatalf("failed to write valid metadata: %v", err)
	}

	// Setup: 1 invalid plugin (no metadata)
	invalidDir := "no-metadata-plugin"
	invalidPath := filepath.Join(pluginsRoot, invalidDir)
	if err := os.MkdirAll(invalidPath, 0755); err != nil {
		t.Fatalf("failed to create invalid plugin dir: %v", err)
	}
	invalidBinaryName := "plugin-" + invalidDir
	if runtime.GOOS == "windows" {
		invalidBinaryName += ".exe"
	}
	invalidBinaryPath := filepath.Join(invalidPath, invalidBinaryName)
	if err := os.WriteFile(invalidBinaryPath, []byte("binary"), 0755); err != nil {
		t.Fatalf("failed to create invalid binary: %v", err)
	}
	// NO metadata file created for invalid plugin

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: only valid plugin restored
	app.pluginsMu.RLock()
	count := len(app.pluginLoaders)
	loader, validExists := app.pluginLoaders[validPluginID]
	app.pluginsMu.RUnlock()

	if !validExists {
		t.Errorf("expected valid plugin %q to be restored", validPluginID)
	}
	if count != 1 {
		t.Errorf("expected exactly 1 loader, but found %d", count)
	}
	if loader != nil && loader.Status() != dto.PluginStatusReady {
		t.Errorf("expected loader status to be READY, got %s", loader.Status())
	}
}

// TestRestoreInstalledPluginsCustomBinaryName verifies a plugin with a custom
// binaryName field in metadata is restored with the custom name instead of the
// hardcoded plugin-{id} convention.
func TestRestoreInstalledPluginsCustomBinaryName(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	dirName := "custom-bin-plugin"
	pluginID := "helm"
	customBinaryName := "custom-bin"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", dirName)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create binary with custom name
	binaryName := customBinaryName
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary content"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// Create metadata with custom binaryName field
	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			Assets: dto.ManifestAssetNames{
				BinaryName: customBinaryName, // Custom binary name
			},
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
		ReleaseTag:  "v1.0.0",
		InstalledAt: "2026-01-01T00:00:00Z",
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		t.Fatalf("failed to marshal metadata: %v", err)
	}
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: loader should be restored with the custom binary name
	app.pluginsMu.RLock()
	loader, exists := app.pluginLoaders[pluginID]
	app.pluginsMu.RUnlock()

	if !exists {
		t.Errorf("expected loader for plugin ID %q to exist, but it does not", pluginID)
		return
	}

	// Verify the loader's binary path uses the custom binary name
	expectedPath := filepath.Join(pluginDir, binaryName)
	if loader.BinaryPath() != expectedPath {
		t.Errorf("expected loader binary path to be %q, but got %q", expectedPath, loader.BinaryPath())
	}

	// Verify loader is marked READY
	if loader.Status() != dto.PluginStatusReady {
		t.Errorf("expected loader status to be READY, got %s", loader.Status())
	}
}

// TestRestoreInstalledPluginsBinaryNameFallback verifies that when metadata
// is missing or has an empty binaryName field, the loader falls back to the
// old plugin-{id} convention.
func TestRestoreInstalledPluginsBinaryNameFallback(t *testing.T) {
	tempHome := t.TempDir()
	t.Setenv("HOME", tempHome)
	t.Setenv("MARKETPLACE_ENABLED", "true")
	app := NewApp("test")

	dirName := "fallback-plugin"
	pluginID := "helm"
	pluginDir := filepath.Join(tempHome, ".galacius", "plugins", dirName)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		t.Fatalf("failed to create plugin directory: %v", err)
	}

	// Create binary using the standard plugin-{pluginID} naming (fallback convention)
	binaryName := fmt.Sprintf("plugin-%s", pluginID)
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}
	binaryPath := filepath.Join(pluginDir, binaryName)
	if err := os.WriteFile(binaryPath, []byte("binary content"), 0755); err != nil {
		t.Fatalf("failed to create binary: %v", err)
	}

	// Create metadata WITHOUT binaryName field (empty string), so fallback applies
	metadata := dto.PluginMetadata{
		Manifest: dto.Manifest{
			ID:      pluginID,
			Name:    "Helm",
			Version: "1.0.0",
			// Assets left zero-valued (empty BinaryName), so fallback applies
			Bundle: dto.ManifestAsset{
				SHA256: "0000000000000000000000000000000000000000000000000000000000000000",
			},
		},
		ReleaseTag:  "v1.0.0",
		InstalledAt: "2026-01-01T00:00:00Z",
	}
	metadataPath := filepath.Join(pluginDir, ".plugin-metadata.json")
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		t.Fatalf("failed to marshal metadata: %v", err)
	}
	if err := os.WriteFile(metadataPath, metadataBytes, 0644); err != nil {
		t.Fatalf("failed to write metadata: %v", err)
	}

	// Restore plugins
	app.restoreInstalledPlugins()

	// Verify: loader should be restored using the fallback naming
	app.pluginsMu.RLock()
	loader, exists := app.pluginLoaders[pluginID]
	app.pluginsMu.RUnlock()

	if !exists {
		t.Errorf("expected loader for plugin ID %q to exist, but it does not", pluginID)
		return
	}

	// Verify the loader's binary path uses the fallback convention
	expectedPath := filepath.Join(pluginDir, binaryName)
	if loader.BinaryPath() != expectedPath {
		t.Errorf("expected loader binary path to be %q (fallback), but got %q", expectedPath, loader.BinaryPath())
	}

	// Verify loader is marked READY
	if loader.Status() != dto.PluginStatusReady {
		t.Errorf("expected loader status to be READY, got %s", loader.Status())
	}
}
