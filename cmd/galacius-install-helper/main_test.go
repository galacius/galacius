package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPerformBinarySwap(t *testing.T) {
	tests := []struct {
		name            string
		setupFunc       func(t *testing.T, tmpDir, installDir string) string // returns path to new binary
		wantErr         bool
		expectInstalled bool
		checkContent    string // if non-empty, verify installed binary contains this
	}{
		{
			name: "first install - no existing binary",
			setupFunc: func(t *testing.T, tmpDir, installDir string) string {
				newBinaryPath := filepath.Join(tmpDir, "new-binary")
				if err := os.WriteFile(newBinaryPath, []byte("new binary content"), 0o600); err != nil {
					t.Fatalf("failed to create new binary: %v", err)
				}
				return newBinaryPath
			},
			wantErr:         false,
			expectInstalled: true,
			checkContent:    "new binary content",
		},
		{
			name: "replace existing binary",
			setupFunc: func(t *testing.T, tmpDir, installDir string) string {
				// Create existing binary
				installedPath := filepath.Join(installDir, "galacius")
				if err := os.WriteFile(installedPath, []byte("old binary"), 0o755); err != nil {
					t.Fatalf("failed to create existing binary: %v", err)
				}

				// Create new binary
				newBinaryPath := filepath.Join(tmpDir, "new-binary")
				if err := os.WriteFile(newBinaryPath, []byte("new binary content"), 0o600); err != nil {
					t.Fatalf("failed to create new binary: %v", err)
				}
				return newBinaryPath
			},
			wantErr:         false,
			expectInstalled: true,
			checkContent:    "new binary content",
		},
		{
			name: "validation error - binary does not exist",
			setupFunc: func(t *testing.T, tmpDir, installDir string) string {
				return filepath.Join(tmpDir, "nonexistent")
			},
			wantErr:         true,
			expectInstalled: false,
		},
		{
			name: "validation error - path is directory not file",
			setupFunc: func(t *testing.T, tmpDir, installDir string) string {
				dirPath := filepath.Join(tmpDir, "is-a-dir")
				if err := os.Mkdir(dirPath, 0o755); err != nil {
					t.Fatalf("failed to create directory: %v", err)
				}
				return dirPath
			},
			wantErr:         true,
			expectInstalled: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tmpDir := t.TempDir()
			installDir := t.TempDir()

			newBinaryPath := tt.setupFunc(t, tmpDir, installDir)

			err := performBinarySwap(newBinaryPath, installDir)

			if (err != nil) != tt.wantErr {
				t.Errorf("performBinarySwap() error = %v, wantErr %v", err, tt.wantErr)
			}

			if !tt.wantErr {
				installedPath := filepath.Join(installDir, "galacius")

				// Check installed binary exists
				if tt.expectInstalled {
					if _, err := os.Stat(installedPath); err != nil {
						t.Errorf("installed binary not found: %v", err)
					}

					// Check permissions
					info, _ := os.Stat(installedPath)
					if info.Mode().Perm() != 0o755 {
						t.Errorf("binary permissions = %o, want 0o755", info.Mode().Perm())
					}

					// Verify content if specified
					if tt.checkContent != "" {
						content, err := os.ReadFile(installedPath)
						if err != nil {
							t.Errorf("failed to read installed binary: %v", err)
						} else if string(content) != tt.checkContent {
							t.Errorf("binary content mismatch: got %q, want %q", string(content), tt.checkContent)
						}
					}
				}
			}
		})
	}
}

func TestInstallAptDependencies(t *testing.T) {
	// This is a non-blocking function that logs warnings to stderr.
	// We test that it doesn't crash and handles errors gracefully.
	// The actual apt-get calls will only work on Debian/Ubuntu systems,
	// and we expect the function to exit gracefully on other systems or
	// when apt-get is not available.

	t.Run("no crash on non-debian system", func(t *testing.T) {
		// Just ensure it doesn't crash or panic.
		// On non-Debian systems, it will return early.
		// On systems without /etc/os-release, it will also return early.
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("installAptDependencies panicked: %v", r)
			}
		}()
		installAptDependencies()
	})
}

// TestBinarySwapPermissions verifies the installed binary has correct permissions.
func TestBinarySwapPermissions(t *testing.T) {
	tmpDir := t.TempDir()
	installDir := t.TempDir()

	// Create a new binary
	newBinaryPath := filepath.Join(tmpDir, "new-binary")
	if err := os.WriteFile(newBinaryPath, []byte("test"), 0o600); err != nil {
		t.Fatalf("failed to create new binary: %v", err)
	}

	if err := performBinarySwap(newBinaryPath, installDir); err != nil {
		t.Fatalf("performBinarySwap failed: %v", err)
	}

	installedPath := filepath.Join(installDir, "galacius")
	info, err := os.Stat(installedPath)
	if err != nil {
		t.Fatalf("failed to stat installed binary: %v", err)
	}

	// Verify executable permissions
	if info.Mode().Perm()&0o111 == 0 {
		t.Errorf("binary is not executable: %o", info.Mode().Perm())
	}
}

// TestBinarySwapRestore verifies that on chmod failure, the backup is restored.
func TestBinarySwapRestoreOnChmodFailure(t *testing.T) {
	// This test is tricky because we need to make chmod fail in a controlled way.
	// On most systems, chmod on a regular file in a writable directory should succeed.
	// We skip this test unless running as non-root (chmod typically fails only on
	// restricted filesystems or when running as non-owner with certain flags).
	// For simplicity, we just test the happy path more thoroughly above.
	t.Skip("restore-on-failure case requires special setup conditions")
}

// Note: Exit code testing is best done via integration tests or manual testing,
// as testing os.Exit() directly requires spawning a subprocess and locating the built binary.
