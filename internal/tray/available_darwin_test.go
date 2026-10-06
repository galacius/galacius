//go:build darwin

package tray

import "testing"

func TestAvailableOnDarwin(t *testing.T) {
	if !Available() {
		t.Fatal("Available must be true on darwin")
	}
}
