package updater

import (
	"context"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/galacius/galacius/internal/storage"
)

const (
	InstallSourceHomebrew = "homebrew"
	InstallSourceApt      = "apt"
	InstallSourceWinget   = "winget"
	InstallSourceManual   = "manual"
)

// homebrewBrewBinaryPaths are the well-known Homebrew installation prefixes
// for the `brew` binary. GUI apps launched via Finder/Spotlight/Dock don't
// inherit the user's shell PATH, so `brew` may not resolve via exec.LookPath
// even when Homebrew is installed.
var homebrewBrewBinaryPaths = []string{
	"/opt/homebrew/bin/brew", // Apple Silicon
	"/usr/local/bin/brew",    // Intel
}

// DetectInstallSource reports which channel the running binary was installed
// through, so the self-updater (and the Settings UI) can distinguish it from
// a manual scripts/install.sh or raw-binary install. A marker persisted by a
// post-install hook (storage.ReadInstallSource) takes precedence when
// present, since it's written directly by the installer at install time
// rather than inferred from the running process's environment; otherwise
// falls back to runtime detection below, which itself falls back to
// InstallSourceManual whenever detection is inconclusive.
func DetectInstallSource() string {
	if source, ok := storage.ReadInstallSource(); ok {
		return source
	}
	return detectInstallSourceAtRuntime()
}

// detectInstallSourceAtRuntime is the environment-based fallback used when no
// post-install marker was found: it inspects the running binary's path and
// platform-specific package-manager state.
func detectInstallSourceAtRuntime() string {
	exe, err := os.Executable()
	if err != nil {
		return InstallSourceManual
	}

	switch runtime.GOOS {
	case "linux":
		if IsAptManagedInstall(exe) {
			return InstallSourceApt
		}
	case "darwin":
		if IsHomebrewCaskroomPath() {
			return InstallSourceHomebrew
		}
	case "windows":
		if isWingetManagedPath(exe) {
			return InstallSourceWinget
		}
	}

	return InstallSourceManual
}

// IsHomebrewCaskroomPath reports whether galacius was installed via Homebrew
// Cask. Homebrew Cask's `app` stanza copies the .app bundle into
// /Applications rather than symlinking it, so the running executable's own
// path carries no Caskroom signal — detection instead checks for the
// galacius Caskroom directory's existence (primary signal) and, when `brew`
// itself is reachable, confirms via `brew list --cask galacius` (secondary
// signal) to rule out an orphaned Caskroom directory left behind by a prior
// `brew uninstall`.
func IsHomebrewCaskroomPath() bool {
	return isHomebrewInstalled(os.Stat, findBrewBinary, brewListCask)
}

// isHomebrewInstalled is a testable variant that accepts injectable
// filesystem/brew-lookup functions, allowing tests to mock both without
// requiring an actual Homebrew installation.
func isHomebrewInstalled(
	statFn func(string) (os.FileInfo, error),
	findBrew func() string,
	checkBrewList func(brewPath string) (installed, ok bool),
) bool {
	// Apple Silicon: /opt/homebrew/Caskroom/galacius
	// Intel: /usr/local/Caskroom/galacius
	_, errARM := statFn("/opt/homebrew/Caskroom/galacius")
	_, errIntel := statFn("/usr/local/Caskroom/galacius")
	if errARM != nil && errIntel != nil {
		return false
	}

	// Secondary confirmation via brew itself, when reachable: guards against
	// an orphaned Caskroom directory (left behind by `brew uninstall`
	// without `--zap`) being mistaken for an active install.
	if installed, ok := checkBrewList(findBrew()); ok {
		return installed
	}

	// brew unreachable or its result was inconclusive: fall back to the
	// directory-existence signal alone.
	return true
}

// findBrewBinary locates the `brew` executable. GUI apps launched outside a
// shell (Finder, Spotlight, Dock) don't inherit the user's PATH, so
// exec.LookPath alone is unreliable — the well-known Homebrew prefixes are
// checked as a fallback.
func findBrewBinary() string {
	if path, err := exec.LookPath("brew"); err == nil {
		return path
	}
	for _, p := range homebrewBrewBinaryPaths {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

// brewListCask runs `brew list --cask --versions galacius` to confirm the
// cask is still actually installed. ok is false when the result is
// inconclusive (brew missing, timed out, or failed for a reason other than
// "not installed"), in which case callers should fall back to another signal
// rather than trust installed.
func brewListCask(brewPath string) (installed, ok bool) {
	if brewPath == "" {
		return false, false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	out, err := exec.CommandContext(ctx, brewPath, "list", "--cask", "--versions", "galacius").Output()
	if err != nil {
		if _, isExitErr := err.(*exec.ExitError); isExitErr {
			// Non-zero exit from `brew list` means "not installed" — a
			// confirmed negative, not an inconclusive failure.
			return false, true
		}
		return false, false
	}

	return len(strings.TrimSpace(string(out))) > 0, true
}

// isWingetManagedPath reports whether path looks like a winget-managed
// portable-exe install, which lands under
// %LOCALAPPDATA%\Microsoft\WinGet\Packages\... with a launch shim under
// %LOCALAPPDATA%\Microsoft\WinGet\Links\....
func isWingetManagedPath(path string) bool {
	lower := strings.ToLower(path)
	return strings.Contains(lower, `winget\packages`) || strings.Contains(lower, `winget\links`)
}
