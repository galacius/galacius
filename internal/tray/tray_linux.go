//go:build linux

package tray

import (
	_ "embed"

	"github.com/godbus/dbus/v5"
)

// Linux desktops have no template-image tinting and panels are dark by
// default (Pop!_OS, GNOME, KDE), so this is a white variant of the ship.
//
//go:embed assets/trayLinux.png
var trayIconPNG []byte

const watcherName = "org.kde.StatusNotifierWatcher"

func trayIcon() []byte { return trayIconPNG }

func platformSetup() {}

// Available reports whether a StatusNotifierItem host is running on the
// session bus (GNOME needs the AppIndicator extension, which Pop!_OS ships;
// KDE, COSMIC and XFCE provide one natively). When false, no icon would be
// shown, so the caller must not hide the window on close.
func Available() bool {
	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return false
	}
	defer conn.Close()

	var hasOwner bool
	err = conn.BusObject().Call("org.freedesktop.DBus.NameHasOwner", 0, watcherName).Store(&hasOwner)
	return err == nil && hasOwner
}
