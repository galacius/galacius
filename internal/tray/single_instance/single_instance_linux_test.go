//go:build linux

package singleinstance

import "testing"

func TestWailsSingleInstanceNames(t *testing.T) {
	name, path := wailsSingleInstanceNames("io.github.gknguyen.galacius")

	if want := "org.wails_app_io_github_gknguyen_galacius.SingleInstance"; name != want {
		t.Errorf("name = %q, want %q", name, want)
	}
	if want := "/org/wails_app_io_github_gknguyen_galacius/SingleInstance"; path != want {
		t.Errorf("path = %q, want %q", path, want)
	}
}
