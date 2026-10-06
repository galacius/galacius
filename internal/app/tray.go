package app

import (
	"github.com/galacius/galacius/internal/tray"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// startTray initializes the menu-bar/system tray (macOS, Linux) with handlers wired to app methods.
// It is a no-op where no tray is available.
func (a *App) startTray() {
	if !tray.Available() {
		return
	}

	handlers := tray.Handlers{
		OnOpen:     a.showMainWindow,
		OnSettings: func() { a.showMainWindow(); a.OpenSettings() },
		OnAbout:    func() { a.showMainWindow(); a.OpenAbout() },
		OnQuit:     a.Quit,
	}

	tray.Start(handlers)
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
