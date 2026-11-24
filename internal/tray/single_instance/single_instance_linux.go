//go:build linux

package singleinstance

import (
	"encoding/json"
	"os"
	"strings"

	"github.com/godbus/dbus/v5"
	"github.com/wailsapp/wails/v2/pkg/options"
)

// ForwardToRunningInstance hands this launch's args to an already-running instance over D-Bus and exits.
// uniqueID must match the SingleInstanceLock.UniqueId passed to Wails.
// It must run before wails.Run: Wails starts OnStartup before it installs its own single-instance lock on Linux,
// so a losing second process would otherwise spin up the tray, gRPC server and plugins before exiting.
// Any failure falls through silently and lets Wails decide.
func ForwardToRunningInstance(uniqueID string) {
	name, path := wailsSingleInstanceNames(uniqueID)

	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return
	}
	defer conn.Close()

	var owned bool
	if err := conn.BusObject().Call("org.freedesktop.DBus.NameHasOwner", 0, name).Store(&owned); err != nil || !owned {
		return
	}

	cwd, err := os.Getwd()
	if err != nil {
		return
	}
	serialized, err := json.Marshal(options.SecondInstanceData{Args: os.Args[1:], WorkingDirectory: cwd})
	if err != nil {
		return
	}

	if err := conn.Object(name, dbus.ObjectPath(path)).Call(name+".SendMessage", 0, string(serialized)).Store(); err != nil {
		return
	}
	os.Exit(0)
}

// wailsSingleInstanceNames derives the D-Bus bus name and object path Wails v2 uses for its single-instance
// listener (see wails/v2 internal/frontend/desktop/linux/single_instance.go). They must match exactly.
func wailsSingleInstanceNames(uniqueID string) (name, path string) {
	id := "wails_app_" + strings.NewReplacer("-", "_", ".", "_").Replace(uniqueID)
	return "org." + id + ".SingleInstance", "/org/" + id + "/SingleInstance"
}
