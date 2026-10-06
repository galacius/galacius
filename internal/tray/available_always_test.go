//go:build darwin || windows

package tray

import "testing"

func TestAvailableOnDarwinAndWindows(t *testing.T) {
	if !Available() {
		t.Fatal("Available must be true on darwin and windows")
	}
}
