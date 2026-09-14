package plugin

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
)

// BundleChecksumHexRe matches a lowercase-or-uppercase hex-encoded SHA256 checksum.
var BundleChecksumHexRe = regexp.MustCompile(`(?i)^[a-f0-9]{64}$`)

// WriteMetadataAtomically writes metadata JSON to destPath via temp file + rename.
// Mirrors the pattern used in plugin.DownloadToFile for atomic writes.
func WriteMetadataAtomically(destPath string, data []byte) error {
	// Ensure parent directory exists
	parentDir := filepath.Dir(destPath)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		return fmt.Errorf("creating directory %q: %w", parentDir, err)
	}

	tempFile := destPath + ".tmp"
	_ = os.Remove(tempFile)

	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		return fmt.Errorf("writing temp file: %w", err)
	}

	if err := os.Rename(tempFile, destPath); err != nil {
		_ = os.Remove(tempFile)
		return fmt.Errorf("moving temp file to %q: %w", destPath, err)
	}

	return nil
}

// ValidPluginID validates that pluginID only contains safe characters
// to prevent path traversal attacks. A single leading dot is allowed so
// hidden directories (e.g. local-dev build output like ".output") can be
// scanned as plugin install directories; a lone "." or ".." can never
// match since at least one alnum/_/- character is still required after it.
func ValidPluginID(pluginID string) bool {
	matched, _ := regexp.MatchString(`^\.?[a-zA-Z0-9_-]+$`, pluginID)
	return matched
}

// DirSize returns the total size in bytes of all regular files under root.
// Errors (missing dir, unreadable entries) are treated as zero rather than
// failing the whole status lookup — size is a display nicety, not load-bearing.
func DirSize(root string) int64 {
	var total int64
	_ = filepath.WalkDir(root, func(_ string, entry os.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return nil
		}
		if info, infoErr := entry.Info(); infoErr == nil {
			total += info.Size()
		}
		return nil
	})
	return total
}
