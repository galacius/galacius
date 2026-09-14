package app

import (
	"fmt"
	"log"
	"os"
	"os/exec"

	"github.com/galacius/galacius/internal/config"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// RestartApp relaunches the app as a new process and quits the current one.
// The menu's "Full Reload" shortcut (Ctrl/Cmd+Shift+R) calls this to recover
// from stale in-memory backend state that a webview-only reload (Ctrl+R) can't
// touch, since Startup and everything it initializes only run once per process.
//
// No-op under `wails dev`: the dev binary depends on a separately-supervised
// Vite dev server, so relaunching it as an orphan process races that server
// instead of loading embedded assets like a production build would, leaving
// a blank window. `wails dev` already rebuilds and relaunches on Go file
// changes, so this isn't needed there anyway.
func (a *App) RestartApp() error {
	if a.version == config.Dev {
		log.Printf("app: RestartApp: skipping full restart under `wails dev` (not supported; the dev server isn't process-supervised)")
		return nil
	}

	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve current executable: %w", err)
	}

	cmd := exec.Command(exePath, os.Args[1:]...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("relaunch app: %w", err)
	}

	runtime.Quit(a.ctx)
	return nil
}
