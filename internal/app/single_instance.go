package app

import "github.com/wailsapp/wails/v2/pkg/options"

// SecondInstanceHandler returns the callback Wails runs when a second launch hands off to this process
// (wired as the SingleInstanceLock in main.go). It is a package-level func rather than a method on *App,
// so Wails doesn't auto-bind it to the frontend.
func SecondInstanceHandler(a *App) func(options.SecondInstanceData) {
	return func(_ options.SecondInstanceData) {
		a.showMainWindow()
	}
}
