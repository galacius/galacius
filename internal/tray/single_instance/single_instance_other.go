//go:build !linux

package singleinstance

// ForwardToRunningInstance is a no-op off Linux: Wails' own single-instance lock handles the hand-off there.
func ForwardToRunningInstance(string) {}
