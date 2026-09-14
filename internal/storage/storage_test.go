package storage

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDir(t *testing.T) {
	tests := []struct {
		name           string
		devMode        bool
		elem           []string
		envOverride    string
		wantSuffix     string
		wantStartsWith string
	}{
		{
			name:           "production mode returns .galacius path",
			devMode:        false,
			elem:           []string{},
			envOverride:    "",
			wantSuffix:     ".galacius",
			wantStartsWith: "",
		},
		{
			name:           "production mode with elem appends correctly",
			devMode:        false,
			elem:           []string{"config", "settings.json"},
			envOverride:    "",
			wantSuffix:     filepath.Join(".galacius", "config", "settings.json"),
			wantStartsWith: "",
		},
		{
			name:           "dev mode returns build/storage path",
			devMode:        true,
			elem:           []string{},
			envOverride:    "",
			wantSuffix:     filepath.Join("build", "storage"),
			wantStartsWith: "",
		},
		{
			name:           "dev mode with elem appends correctly",
			devMode:        true,
			elem:           []string{"plugins", "list.json"},
			envOverride:    "",
			wantSuffix:     filepath.Join("build", "storage", "plugins", "list.json"),
			wantStartsWith: "",
		},
		{
			name:           "production mode with GALACIUS_ROOT_DIR override",
			devMode:        false,
			elem:           []string{},
			envOverride:    "/custom/path",
			wantSuffix:     "/custom/path",
			wantStartsWith: "/custom/path",
		},
		{
			name:           "production mode with GALACIUS_ROOT_DIR override and elem",
			devMode:        false,
			elem:           []string{"config", "settings.json"},
			envOverride:    "/custom/path",
			wantSuffix:     filepath.Join("/custom/path", "config", "settings.json"),
			wantStartsWith: "/custom/path",
		},
		{
			name:           "dev mode ignores GALACIUS_ROOT_DIR override",
			devMode:        true,
			elem:           []string{},
			envOverride:    "/custom/path",
			wantSuffix:     filepath.Join("build", "storage"),
			wantStartsWith: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Cleanup(func() {
				devMode = false
				rootDirOverride = ""
			})

			if tt.envOverride != "" {
				SetRootDirOverride(tt.envOverride)
			}

			SetDevMode(tt.devMode)
			got := Dir(tt.elem...)

			if !strings.HasSuffix(got, tt.wantSuffix) {
				t.Errorf("Dir() = %q, want suffix %q", got, tt.wantSuffix)
			}

			// For dev mode, verify it's an absolute path starting with cwd
			if tt.devMode {
				cwd, err := os.Getwd()
				if err != nil {
					t.Fatalf("os.Getwd() failed: %v", err)
				}
				if !strings.HasPrefix(got, cwd) {
					t.Errorf("Dev mode Dir() = %q, want to start with cwd %q", got, cwd)
				}
			}

			// For production mode with override, verify it uses the override
			if !tt.devMode && tt.envOverride != "" {
				if tt.wantStartsWith != "" && !strings.HasPrefix(got, tt.wantStartsWith) {
					t.Errorf("Production mode with override Dir() = %q, want to start with %q", got, tt.wantStartsWith)
				}
			}

			// For production mode without override, verify it contains home directory
			if !tt.devMode && tt.envOverride == "" {
				home, err := os.UserHomeDir()
				if err != nil {
					home = os.ExpandEnv("$HOME")
				}
				if !strings.HasPrefix(got, home) {
					t.Errorf("Production mode Dir() = %q, want to start with home %q", got, home)
				}
			}
		})
	}
}

func TestDevModeIsIsolated(t *testing.T) {
	t.Cleanup(func() {
		devMode = false
	})

	// Set dev mode
	SetDevMode(true)
	path1 := Dir()

	// Reset and check it's false
	SetDevMode(false)
	path2 := Dir()

	if strings.Contains(path1, "build/storage") {
		t.Logf("Dev mode path: %s", path1)
	} else {
		t.Errorf("Expected dev mode path to contain build/storage, got %q", path1)
	}

	if strings.Contains(path2, ".galacius") {
		t.Logf("Production mode path: %s", path2)
	} else {
		t.Errorf("Expected production mode path to contain .galacius, got %q", path2)
	}

	// Verify they're different
	if path1 == path2 {
		t.Errorf("Dev mode and production mode paths should differ, but both are %q", path1)
	}
}

// TestSetRootDirOverride verifies that SetRootDirOverride correctly redirects Dir()
// in production mode, and that an empty string clears the override back to ~/.galacius.
func TestSetRootDirOverride(t *testing.T) {
	t.Cleanup(func() {
		devMode = false
		rootDirOverride = ""
	})

	SetDevMode(false)

	// Initially, Dir() should return ~/.galacius
	initialPath := Dir()
	home, _ := os.UserHomeDir()
	if !strings.Contains(initialPath, ".galacius") {
		t.Fatalf("Expected initial Dir() to contain .galacius, got %q", initialPath)
	}

	// Set an override
	customPath := "/custom/galacius"
	SetRootDirOverride(customPath)
	overriddenPath := Dir()
	if overriddenPath != customPath {
		t.Errorf("After SetRootDirOverride(%q), expected Dir()=%q, got %q", customPath, customPath, overriddenPath)
	}

	// Clear the override with empty string
	SetRootDirOverride("")
	clearedPath := Dir()
	if !strings.Contains(clearedPath, ".galacius") {
		t.Errorf("After SetRootDirOverride(\"\"), expected Dir() to contain .galacius, got %q", clearedPath)
	}
	if !strings.HasPrefix(clearedPath, home) {
		t.Errorf("After clearing override, expected Dir() to start with home %q, got %q", home, clearedPath)
	}
}

// TestSetRootDirOverride_IgnoredInDevMode verifies that SetRootDirOverride is ignored
// when dev mode is enabled.
func TestSetRootDirOverride_IgnoredInDevMode(t *testing.T) {
	t.Cleanup(func() {
		devMode = false
		rootDirOverride = ""
	})

	SetDevMode(true)
	customPath := "/custom/galacius"
	SetRootDirOverride(customPath)

	devPath := Dir()
	if !strings.Contains(devPath, filepath.Join("build", "storage")) {
		t.Errorf("In dev mode, Dir() should still use build/storage, got %q", devPath)
	}

	// Also verify it's an absolute path starting with cwd
	cwd, _ := os.Getwd()
	if !strings.HasPrefix(devPath, cwd) {
		t.Errorf("In dev mode, Dir() should start with cwd %q, got %q", cwd, devPath)
	}
}

// TestInstallSourceMarker verifies the read/reset round trip for the
// install-source marker file written by post-install hooks (e.g. the
// Homebrew cask's postflight).
func TestInstallSourceMarker(t *testing.T) {
	t.Cleanup(func() {
		devMode = false
		rootDirOverride = ""
	})

	tmp := t.TempDir()
	SetDevMode(false)
	SetRootDirOverride(tmp)

	if source, ok := ReadInstallSource(); ok {
		t.Errorf("ReadInstallSource() with no marker file: got (%q, true), want ok=false", source)
	}

	if err := os.MkdirAll(tmp, 0o700); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.WriteFile(filepath.Join(tmp, "install-source"), []byte("homebrew\n"), 0o600); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}

	source, ok := ReadInstallSource()
	if !ok || source != "homebrew" {
		t.Errorf("ReadInstallSource() = (%q, %v), want (\"homebrew\", true)", source, ok)
	}

	if err := ResetInstallSource(); err != nil {
		t.Fatalf("ResetInstallSource: %v", err)
	}
	if source, ok := ReadInstallSource(); ok {
		t.Errorf("ReadInstallSource() after reset: got (%q, true), want ok=false", source)
	}

	// Resetting an already-absent marker must not error.
	if err := ResetInstallSource(); err != nil {
		t.Errorf("ResetInstallSource() on absent marker: %v", err)
	}
}

// TestSetRootDirOverride_WithPathElements verifies that SetRootDirOverride works
// correctly when Dir() is called with additional path elements.
func TestSetRootDirOverride_WithPathElements(t *testing.T) {
	t.Cleanup(func() {
		devMode = false
		rootDirOverride = ""
	})

	SetDevMode(false)

	customPath := "/custom/galacius"
	SetRootDirOverride(customPath)

	pathWithElems := Dir("config", "settings.json")
	expected := filepath.Join(customPath, "config", "settings.json")
	if pathWithElems != expected {
		t.Errorf("Dir(\"config\", \"settings.json\") with override=%q: expected %q, got %q",
			customPath, expected, pathWithElems)
	}
}
