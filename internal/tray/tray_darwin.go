//go:build darwin

package tray

import (
	_ "embed"
	"unsafe"
)

/*
#cgo LDFLAGS: -framework Cocoa
extern void GLCStartTray(const void* png, int len);
extern void GLCStopTray(void);
extern void galaciusTrayItemClicked(int tag);
*/
import "C"

//go:embed assets/trayTemplate.png
var trayIconPNG []byte

const Supported = true

// Start initializes the macOS menu-bar status item with the provided handlers.
// It is idempotent: calling it multiple times is safe.
func Start(h Handlers) {
	SetHandlers(h)
	if len(trayIconPNG) == 0 {
		return
	}
	C.GLCStartTray(unsafe.Pointer(&trayIconPNG[0]), C.int(len(trayIconPNG)))
}

// Stop removes the menu-bar status item and releases resources.
func Stop() {
	C.GLCStopTray()
}

// galaciusTrayItemClicked is exported to C and called when a menu item is clicked.
//
//export galaciusTrayItemClicked
func galaciusTrayItemClicked(tag C.int) {
	dispatch(int(tag))
}
