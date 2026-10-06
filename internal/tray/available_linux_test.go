//go:build linux

package tray

import "testing"

// Availability depends on the session bus, so only assert it does not panic.
func TestAvailableDoesNotPanic(t *testing.T) {
	_ = Available()
}
