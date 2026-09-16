package app

import (
	"os"
	"path/filepath"
	"testing"
)

// TestPluginsRootDirUsesUserHome tests that pluginsRootDir() always returns
// ~/.galacius/plugins.
func TestPluginsRootDirUsesUserHome(t *testing.T) {
	app := NewApp("test")

	result := app.pluginsRootDir()

	home, err := os.UserHomeDir()
	if err != nil {
		t.Fatalf("os.UserHomeDir() failed: %v", err)
	}

	expected := filepath.Join(home, ".galacius", "plugins")
	if result != expected {
		t.Errorf("pluginsRootDir() mismatch: got %q, expected %q", result, expected)
	}
}

// TestPluginsRootDirMultipleCallsConsistent tests that multiple calls to pluginsRootDir()
// return the same value.
func TestPluginsRootDirMultipleCallsConsistent(t *testing.T) {
	app := NewApp("test")

	result1 := app.pluginsRootDir()
	result2 := app.pluginsRootDir()
	result3 := app.pluginsRootDir()

	if result1 != result2 || result2 != result3 {
		t.Errorf("pluginsRootDir() returned different values on consecutive calls: %q, %q, %q",
			result1, result2, result3)
	}
}

// BenchmarkPluginsRootDir measures the performance of pluginsRootDir() calls.
func BenchmarkPluginsRootDir(b *testing.B) {
	app := NewApp("test")

	b.ResetTimer()
	for b.Loop() {
		_ = app.pluginsRootDir()
	}
}
