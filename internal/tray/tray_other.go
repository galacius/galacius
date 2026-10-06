//go:build !darwin && !linux && !windows

package tray

// Available is false where no tray is implemented, so the window is never hidden on close.
func Available() bool { return false }

func Start(_ Handlers) {}

func Stop() {}
