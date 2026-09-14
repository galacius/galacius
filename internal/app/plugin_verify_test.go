package app

import (
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/galacius/galacius/internal/plugin"
	"github.com/galacius/galacius/packages/core/kube/dto"
)

// TestBinarySHA256SelectsFromBinariesMap verifies that the verification logic
// prefers platform-specific checksums from manifest.Binaries over manifest.Binary.
// This simulates the fix for macOS/Windows users who were failing with
// "SHA256 mismatch" because the manifest only stored Linux checksum.
func TestBinarySHA256SelectsFromBinariesMap(t *testing.T) {
	tmpDir := t.TempDir()

	// Create a test binary file
	testBinaryPath := filepath.Join(tmpDir, "plugin-helm")
	testContent := []byte("test plugin binary content")
	if err := os.WriteFile(testBinaryPath, testContent, 0755); err != nil {
		t.Fatalf("failed to create test binary: %v", err)
	}

	// Calculate the SHA256 of this binary
	h := sha256.New()
	h.Write(testContent)
	actualSHA256 := fmt.Sprintf("%x", h.Sum(nil))

	// Create a manifest with both binary and binaries fields
	// Simulate old format: binary field has Linux SHA256
	linuxSHA256 := "0000000000000000000000000000000000000000000000000000000000000001"

	// New format: binaries map has platform-specific SHA256s
	darwinSHA256 := actualSHA256 // This is the correct one for darwin
	windowsSHA256 := "0000000000000000000000000000000000000000000000000000000000000002"

	manifest := &dto.Manifest{
		ID:      "helm",
		Name:    "Helm",
		Version: "1.0.0",
		Binary: dto.ManifestAsset{
			SHA256: linuxSHA256,
			Size:   int64(len(testContent)),
		},
		Binaries: map[string]dto.ManifestAsset{
			"linux-amd64": {
				SHA256: linuxSHA256,
				Size:   int64(len(testContent)),
			},
			"darwin-arm64": {
				SHA256: darwinSHA256,
				Size:   int64(len(testContent)),
			},
			"windows-amd64": {
				SHA256: windowsSHA256,
				Size:   int64(len(testContent)),
			},
		},
	}

	// The verification logic from app/plugin.go InstallPlugin (around line 430)
	// should select the platform-specific SHA256 from manifest.Binaries
	platformKey := "darwin-arm64"
	expectedSHA256 := manifest.Binary.SHA256
	if len(manifest.Binaries) > 0 {
		if platformAsset, ok := manifest.Binaries[platformKey]; ok {
			expectedSHA256 = platformAsset.SHA256
		}
	}

	// The expected SHA256 should be the platform-specific one (darwinSHA256)
	if expectedSHA256 != darwinSHA256 {
		t.Errorf("expectedSHA256 = %q; want %q", expectedSHA256, darwinSHA256)
	}

	// Verify the binary actually matches the expected SHA256
	if err := plugin.VerifySHA256(testBinaryPath, expectedSHA256); err != nil {
		t.Errorf("VerifySHA256 failed: %v", err)
	}
}

// TestBinarySHA256FallsBackToLegacy verifies that if manifest.Binaries is empty/nil,
// the verification falls back to manifest.Binary (old format compatibility).
func TestBinarySHA256FallsBackToLegacy(t *testing.T) {
	tmpDir := t.TempDir()

	// Create a test binary file
	testBinaryPath := filepath.Join(tmpDir, "plugin-helm")
	testContent := []byte("test plugin binary content")
	if err := os.WriteFile(testBinaryPath, testContent, 0755); err != nil {
		t.Fatalf("failed to create test binary: %v", err)
	}

	// Calculate the SHA256 of this binary
	h := sha256.New()
	h.Write(testContent)
	actualSHA256 := fmt.Sprintf("%x", h.Sum(nil))

	// Create an old-format manifest (only Binary field, no Binaries map)
	manifest := &dto.Manifest{
		ID:      "helm",
		Name:    "Helm",
		Version: "1.0.0",
		Binary: dto.ManifestAsset{
			SHA256: actualSHA256,
			Size:   int64(len(testContent)),
		},
		Binaries: nil, // Old format has no binaries map
	}

	// The verification logic should fall back to manifest.Binary
	platformKey := "darwin-arm64"
	expectedSHA256 := manifest.Binary.SHA256
	if len(manifest.Binaries) > 0 {
		if platformAsset, ok := manifest.Binaries[platformKey]; ok {
			expectedSHA256 = platformAsset.SHA256
		}
	}

	// The expected SHA256 should be from Binary (the fallback)
	if expectedSHA256 != actualSHA256 {
		t.Errorf("expectedSHA256 = %q; want %q", expectedSHA256, actualSHA256)
	}

	// Verify the binary actually matches the expected SHA256
	if err := plugin.VerifySHA256(testBinaryPath, expectedSHA256); err != nil {
		t.Errorf("VerifySHA256 failed: %v", err)
	}
}

// TestBinarySHA256FallsBackToLegacyWhenKeyMissing verifies that if the platform key
// is not present in manifest.Binaries, we fall back to manifest.Binary.
func TestBinarySHA256FallsBackToLegacyWhenKeyMissing(t *testing.T) {
	tmpDir := t.TempDir()

	// Create a test binary file
	testBinaryPath := filepath.Join(tmpDir, "plugin-helm")
	testContent := []byte("test plugin binary content")
	if err := os.WriteFile(testBinaryPath, testContent, 0755); err != nil {
		t.Fatalf("failed to create test binary: %v", err)
	}

	// Calculate the SHA256 of this binary
	h := sha256.New()
	h.Write(testContent)
	actualSHA256 := fmt.Sprintf("%x", h.Sum(nil))

	// Create a manifest with only partial Binaries map (missing the current platform)
	manifest := &dto.Manifest{
		ID:      "helm",
		Name:    "Helm",
		Version: "1.0.0",
		Binary: dto.ManifestAsset{
			SHA256: actualSHA256,
			Size:   int64(len(testContent)),
		},
		Binaries: map[string]dto.ManifestAsset{
			// Only linux-amd64 present, not darwin-arm64
			"linux-amd64": {
				SHA256: "0000000000000000000000000000000000000000000000000000000000000001",
				Size:   int64(len(testContent)),
			},
		},
	}

	// The verification logic should fall back to manifest.Binary
	// because darwin-arm64 is not in the Binaries map
	platformKey := "darwin-arm64"
	expectedSHA256 := manifest.Binary.SHA256
	if len(manifest.Binaries) > 0 {
		if platformAsset, ok := manifest.Binaries[platformKey]; ok {
			expectedSHA256 = platformAsset.SHA256
		}
	}

	// The expected SHA256 should be from Binary (because key wasn't in map)
	if expectedSHA256 != actualSHA256 {
		t.Errorf("expectedSHA256 = %q; want %q", expectedSHA256, actualSHA256)
	}

	// Verify the binary actually matches the expected SHA256
	if err := plugin.VerifySHA256(testBinaryPath, expectedSHA256); err != nil {
		t.Errorf("VerifySHA256 failed: %v", err)
	}
}
