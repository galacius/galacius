// Package tray provides a native macOS menu-bar status item (tray).
// On non-Darwin platforms it is a no-op. The package is a leaf with no
// dependencies on app, wails, config, or kube packages.
package tray

import (
	"sync"
)

// Item tag constants for menu items.
const (
	ItemOpen = iota + 1
	ItemSettings
	ItemAbout
	ItemQuit
)

// Handlers groups the callbacks invoked when menu items are clicked.
type Handlers struct {
	OnOpen     func()
	OnSettings func()
	OnAbout    func()
	OnQuit     func()
}

var (
	mu       sync.Mutex
	handlers Handlers
)

// SetHandlers stores the handlers to be called by tray menu item clicks,
// replacing any previously set.
func SetHandlers(h Handlers) {
	mu.Lock()
	defer mu.Unlock()
	handlers = h
}

// dispatch maps a tag to a handler and invokes it asynchronously.
// Unknown tags and nil handlers are ignored without panic.
// Handlers are always run via `go h.X()` to avoid blocking the ObjC callback thread.
func dispatch(tag int) {
	mu.Lock()
	defer mu.Unlock()

	var fn func()
	switch tag {
	case ItemOpen:
		fn = handlers.OnOpen
	case ItemSettings:
		fn = handlers.OnSettings
	case ItemAbout:
		fn = handlers.OnAbout
	case ItemQuit:
		fn = handlers.OnQuit
	}

	if fn != nil {
		go fn()
	}
}
