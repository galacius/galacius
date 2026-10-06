//go:build !darwin

package tray

import "testing"

func TestUnsupportedElsewhere(t *testing.T) {
	if Supported {
		t.Fatal("Supported must be false on non-darwin")
	}
}
