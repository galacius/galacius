package app

import (
	"context"
	"log"
	"os"
	"os/exec"
	goruntime "runtime"
	"strings"
	"time"

	"github.com/galacius/galacius/internal/storage"
)

// GetDefaultShell returns the shell that will be used when ShellPath is not
// configured: $SHELL from the environment, falling back to /bin/zsh.
func (a *App) GetDefaultShell() string {
	if s := os.Getenv("SHELL"); s != "" {
		return s
	}
	return "/bin/zsh"
}

// GetAppDir returns the app's data directory (~/.galacius).
func (a *App) GetAppDir() string {
	return storage.Dir()
}

// OpenAppDir opens the app's data directory in the OS file manager
// (Finder on macOS, Explorer on Windows, xdg-open elsewhere).
func (a *App) OpenAppDir() error {
	dir := storage.Dir()
	var cmd *exec.Cmd
	switch goruntime.GOOS {
	case "darwin":
		cmd = exec.Command("open", dir)
	case "windows":
		cmd = exec.Command("explorer", dir)
	default:
		cmd = exec.Command("xdg-open", dir)
	}
	return cmd.Start()
}

// resolveLoginShellPATH queries the user's shell for its full PATH and sets
// it on the current process so exec credential plugins (e.g. aws, gcloud) and
// cluster proxy setup commands can find binaries the user only put on PATH
// via their shell rc file. On non-macOS platforms this is a no-op. Failures
// are logged but never fatal — the app starts normally with the original
// PATH. shellPath overrides the auto-detected $SHELL when non-empty.
//
// Runs the shell as both login (-l) and interactive (-i): login alone only
// sources /etc/zprofile and ~/.zprofile, not ~/.zshrc — but ~/.zshrc is where
// most users (following zsh convention) actually put PATH additions like
// `export PATH="$HOME/bin:$PATH"`. A GUI-launched app resolved with login-only
// would then never find a script placed on PATH that way, even though a
// Terminal-launched copy of the exact same binary works fine (Terminal opens
// an interactive login shell, which sources both).
func resolveLoginShellPATH(shellPath string) {
	if goruntime.GOOS != "darwin" {
		return
	}
	shell := shellPath
	if shell == "" {
		shell = os.Getenv("SHELL")
	}
	if shell == "" {
		shell = "/bin/zsh"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// Wrapped in markers: an interactive shell's rc files can print banners,
	// update notices, or prompt-framework noise (e.g. oh-my-zsh, p10k) to
	// stdout before running our -c command, which would otherwise corrupt a
	// bare `echo $PATH` capture.
	const marker = "__galacius_path__:"
	out, err := exec.CommandContext(ctx, shell, "-i", "-l", "-c", "echo "+marker+"$PATH").Output()
	if err != nil {
		log.Printf("[env] login shell PATH resolution failed (shell: %q): %v", shell, err)
		return
	}
	for line := range strings.SplitSeq(string(out), "\n") {
		_, rest, found := strings.Cut(line, marker)
		if !found {
			continue
		}
		if path := strings.TrimSpace(rest); path != "" {
			os.Setenv("PATH", path) //nolint:errcheck
			log.Printf("[env] PATH resolved from login shell %q", shell)
		}
		return
	}
	log.Printf("[env] login shell PATH resolution: marker not found in output (shell: %q)", shell)
}
