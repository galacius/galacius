package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
)

func main() {
	binary := flag.String("binary", "", "path to the downloaded new galacius binary")
	version := flag.String("version", "", "version string being installed")
	flag.Parse()

	if *binary == "" {
		fmt.Fprintf(os.Stderr, "ERROR: --binary is required\n")
		os.Exit(2)
	}
	if *version == "" {
		fmt.Fprintf(os.Stderr, "ERROR: --version is required\n")
		os.Exit(2)
	}

	// Hardcoded install directory prevents privilege-boundary violations.
	// The helper always installs to /usr/local/bin, regardless of caller input.
	const installDir = "/usr/local/bin"

	// Perform the binary swap (install the new binary, back up the old one).
	if err := performBinarySwap(*binary, installDir); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}

	// Install missing apt dependencies (non-blocking; warnings only).
	installAptDependencies()

	// Success
	fmt.Fprintf(os.Stdout, "update complete: %s installed\n", *version)
	os.Exit(0)
}

// performBinarySwap validates the downloaded binary, backs up the existing
// installed binary, moves the new one into place, and sets proper permissions.
// On any failure, it attempts to restore from backup and returns a clear error.
func performBinarySwap(newBinaryPath, installDir string) error {
	// Validate the new binary exists and is a regular file.
	info, err := os.Stat(newBinaryPath)
	if err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("validation failed: %q is not a regular file", newBinaryPath)
	}

	installedBinary := filepath.Join(installDir, "galacius")
	backupBinary := installedBinary + ".backup"

	// Back up the existing binary if it exists.
	if _, err := os.Stat(installedBinary); err == nil {
		// Only back up if it doesn't already exist (avoid overwriting a previous backup).
		if _, err := os.Stat(backupBinary); err != nil {
			if err := os.Rename(installedBinary, backupBinary); err != nil {
				return fmt.Errorf("backup failed: %w", err)
			}
		} else {
			// Backup already exists; remove the current binary to make room for the new one.
			if err := os.Remove(installedBinary); err != nil {
				return fmt.Errorf("remove current binary failed: %w", err)
			}
		}
	}

	// Move the new binary into place.
	if err := os.Rename(newBinaryPath, installedBinary); err != nil {
		// Attempt restore on failure.
		if restoreErr := os.Rename(backupBinary, installedBinary); restoreErr != nil {
			return fmt.Errorf("move failed: %w; restore also failed: %w", err, restoreErr)
		}
		return fmt.Errorf("move failed: %w", err)
	}

	// Make the new binary executable.
	if err := os.Chmod(installedBinary, 0o755); err != nil {
		// Attempt restore on failure.
		if restoreErr := os.Rename(backupBinary, installedBinary); restoreErr != nil {
			return fmt.Errorf("chmod failed: %w; restore also failed: %w", err, restoreErr)
		}
		return fmt.Errorf("chmod failed: %w", err)
	}

	// Clean up the backup if everything succeeded.
	_ = os.Remove(backupBinary)

	return nil
}

// installAptDependencies checks whether this is a Debian/Ubuntu system and
// installs missing GTK/WebKit dependencies. Failures are logged to stderr
// with a WARNING prefix but do not cause the overall update to fail.
func installAptDependencies() {
	// Check if this is a Debian/Ubuntu system by reading /etc/os-release.
	osRelease, err := os.ReadFile("/etc/os-release")
	if err != nil {
		// Not a standard Linux distro or file doesn't exist; skip silently.
		return
	}

	// Simple check: look for ID_LIKE=debian or ID=debian/ubuntu in /etc/os-release.
	osReleaseStr := string(osRelease)
	isDebianFamily := strings.Contains(osReleaseStr, "ID=debian") ||
		strings.Contains(osReleaseStr, "ID=ubuntu") ||
		strings.Contains(osReleaseStr, "ID_LIKE=debian")
	if !isDebianFamily {
		return
	}

	// Check which packages are missing using dpkg.
	missingPackages := []string{}
	for _, pkg := range []string{"libgtk-3-0", "libwebkit2gtk-4.1-0"} {
		cmd := exec.Command("dpkg", "-s", pkg)
		if err := cmd.Run(); err != nil {
			// dpkg -s returns non-zero for packages not actually installed (including removed/config-remains state).
			missingPackages = append(missingPackages, pkg)
		}
	}

	if len(missingPackages) == 0 {
		// All dependencies are already installed.
		return
	}

	// Try to install missing packages using apt-get.
	cmd := exec.Command("apt-get", "update")
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "WARNING: apt-get update failed: %v\n", err)
		return
	}

	cmd = exec.Command("apt-get", "install", "-y")
	cmd.Args = append(cmd.Args, missingPackages...)
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "WARNING: apt-get install failed: %v\n", err)
		if slices.Contains(missingPackages, "libwebkit2gtk-4.1-0") {
			fmt.Fprintf(os.Stderr, "WARNING: libwebkit2gtk-4.1-0 unavailable; trying libwebkit2gtk-4.0-37 fallback (Ubuntu 22.04 and earlier do not package 4.1)...\n")
			fallbackCmd := exec.Command("apt-get", "install", "-y", "libwebkit2gtk-4.0-37")
			if fbErr := fallbackCmd.Run(); fbErr != nil {
				fmt.Fprintf(os.Stderr, "WARNING: libwebkit2gtk-4.0-37 fallback install also failed: %v\n", fbErr)
			} else {
				fmt.Fprintf(os.Stdout, "INFO: libwebkit2gtk-4.0-37 installed as fallback\n")
			}
		}
		// Do not fail the overall update.
		return
	}
}
