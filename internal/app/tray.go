package app

import (
	"log"

	"github.com/galacius/galacius/internal/tray"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// startTray initializes the macOS menu-bar tray with handlers wired to app methods.
// On non-Darwin platforms this is a no-op.
func (a *App) startTray() {
	if !tray.Supported {
		return
	}

	handlers := tray.Handlers{
		OnOpen:     a.showMainWindow,
		OnSettings: func() { a.showMainWindow(); a.OpenSettings() },
		OnAbout:    func() { a.showMainWindow(); a.OpenAbout() },
		OnQuit:     a.Quit,
	}

	if err := tray.Start(handlers); err != nil {
		log.Printf("failed to start tray: %v", err)
	}
}

// showMainWindow shows the main window. It is unexported (not auto-bound by Wails).
// It is a no-op if a.ctx is nil (before Startup has completed).
func (a *App) showMainWindow() {
	if a.ctx == nil {
		return
	}
	wailsruntime.Show(a.ctx)
	wailsruntime.WindowUnminimise(a.ctx)
	wailsruntime.WindowShow(a.ctx)
}
