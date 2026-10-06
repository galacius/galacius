//go:build !darwin && !linux && !windows

package tray

import "testing"

func TestUnavailableElsewhere(t *testing.T) {
	if Available() {
		t.Fatal("Available must be false where no tray is implemented")
	}
}
