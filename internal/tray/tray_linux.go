//go:build linux

package tray

import (
	_ "embed"
	"log"
	"sync"

	"fyne.io/systray"
	"github.com/godbus/dbus/v5"
)

// Linux desktops have no template-image tinting and panels are dark by
// default (Pop!_OS, GNOME, KDE), so this is a white variant of the ship.
//
//go:embed assets/trayLinux.png
var trayIconPNG []byte

const watcherName = "org.kde.StatusNotifierWatcher"

var (
	stateMu sync.Mutex
	started bool
	endFn   func()
)

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

// Start registers the status item over D-Bus (pure Go, no GTK involvement, so
// it coexists with Wails' own GTK main loop). Only the first call has an
// effect for the process lifetime; later calls just replace the handlers.
func Start(h Handlers) {
	SetHandlers(h)

	stateMu.Lock()
	defer stateMu.Unlock()
	if started {
		return
	}
	started = true

	start, end := systray.RunWithExternalLoop(onReady, nil)
	endFn = end
	go start()
}

// Stop unregisters the status item. The underlying library can only be
// started once per process, so Start is a no-op afterwards.
func Stop() {
	stateMu.Lock()
	end := endFn
	endFn = nil
	stateMu.Unlock()

	if end == nil {
		return
	}
	defer func() {
		if r := recover(); r != nil {
			log.Printf("tray: stop: %v", r)
		}
	}()
	end()
}

func onReady() {
	systray.SetIcon(trayIconPNG)
	systray.SetTitle("Galacius")
	systray.SetTooltip("Galacius")

	for _, it := range []struct {
		tag   int
		title string
	}{
		{ItemOpen, "Open Galacius"},
		{ItemSettings, "Settings"},
		{ItemAbout, "About Galacius"},
		{-1, ""},
		{ItemQuit, "Quit App"},
	} {
		if it.tag < 0 {
			systray.AddSeparator()
			continue
		}
		item := systray.AddMenuItem(it.title, "")
		go func(tag int) {
			for range item.ClickedCh {
				dispatch(tag)
			}
		}(it.tag)
	}
}
