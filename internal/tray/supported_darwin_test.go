//go:build darwin

package tray

import "testing"

func TestSupportedOnDarwin(t *testing.T) {
	if !Supported {
		t.Fatal("Supported must be true on darwin")
	}
}
