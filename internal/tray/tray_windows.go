//go:build windows

package tray

import (
	_ "embed"

	"fyne.io/systray"
)

// Windows requires an .ico for notification-area icons. The colored logo is
// used as-is since the taskbar can be light or dark.
//
//go:embed assets/trayWindows.ico
var trayIconICO []byte

func trayIcon() []byte { return trayIconICO }

// platformSetup makes a left-click on the icon open the window (the Windows
// convention); right-click shows the menu.
func platformSetup() {
	systray.SetOnTapped(func() { dispatch(ItemOpen) })
}

// Available is always true on Windows (the notification area always exists).
func Available() bool { return true }
