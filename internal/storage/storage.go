// Package storage resolves the on-disk directory Galacius uses for persistent
// app data (settings, installed plugins). In development mode (when SetDevMode(true)
// is called), it returns build/storage relative to the current working directory.
// Otherwise it defaults to ~/.galacius, which can be overridden in production
// mode via SetRootDirOverride (wired at startup from the GALACIUS_ROOT_DIR
// environment variable, see config.GetRootDirOverride).
package storage

import (
	"log"
	"os"
	"path/filepath"
	"strings"
)

var (
	devMode         bool
	rootDirOverride string
)

// installSourceFileName is the marker file a platform-specific post-install
// hook (e.g. the Homebrew cask's postflight) writes to record which channel
// installed the app. Runtime detection (internal/updater.DetectInstallSource)
// can be fooled by app translocation, a PATH that excludes `brew`, or other
// environment quirks at the moment the app happens to start; a marker written
// directly by the installer at install time is authoritative and takes
// precedence over that heuristic. The file holds nothing but the trimmed
// source name (e.g. "homebrew").
const installSourceFileName = "install-source"

// ReadInstallSource returns the install-source marker persisted by a
// post-install hook, if one exists. ok is false when no marker file is
// present (or it's empty), signaling callers to fall back to runtime
// detection instead.
func ReadInstallSource() (source string, ok bool) {
	data, err := os.ReadFile(Dir(installSourceFileName))
	if err != nil {
		return "", false
	}
	trimmed := strings.TrimSpace(string(data))
	return trimmed, trimmed != ""
}

// ResetInstallSource removes the persisted install-source marker, so that
// after an uninstall, a later install through a different channel isn't
// stuck reporting the old one. Called from an installer's uninstall hook
// (see the Homebrew cask's uninstall stanza).
func ResetInstallSource() error {
	err := os.Remove(Dir(installSourceFileName))
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// SetDevMode enables or disables development mode. When enabled, Dir() resolves
// to build/storage relative to the current working directory instead of ~/.galacius.
func SetDevMode(mode bool) {
	devMode = mode
}

// SetRootDirOverride sets the directory used in place of ~/.galacius in
// production mode. Callers pass the value of the GALACIUS_ROOT_DIR
// environment variable (see config.GetRootDirOverride); an empty string
// clears the override.
func SetRootDirOverride(dir string) {
	rootDirOverride = dir
}

// Dir returns the Galacius storage directory. In development mode, this is
// build/storage relative to the current working directory; otherwise it is
// ~/.galacius (or the path specified in GALACIUS_ROOT_DIR if set in production mode).
// All results are joined with any additional path elements.
func Dir(elem ...string) string {
	if devMode {
		return devBuildDir(elem...)
	}
	return homeDir(elem...)
}

func devBuildDir(elem ...string) string {
	cwd, err := os.Getwd()
	if err != nil {
		log.Printf("storage: failed to get working directory: %v; falling back to ~/.galacius", err)
		return homeDir(elem...)
	}
	return filepath.Join(append([]string{cwd, "build", "storage"}, elem...)...)
}

func homeDir(elem ...string) string {
	// Use the GALACIUS_ROOT_DIR override in production mode, if set (see SetRootDirOverride).
	if rootDirOverride != "" {
		return filepath.Join(append([]string{rootDirOverride}, elem...)...)
	}

	home, err := os.UserHomeDir()
	if err != nil {
		home = os.ExpandEnv("$HOME")
	}
	return filepath.Join(append([]string{home, ".galacius"}, elem...)...)
}
