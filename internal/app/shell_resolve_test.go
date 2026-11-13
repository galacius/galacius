package app

import (
	"os"
	"path/filepath"
	goruntime "runtime"
	"testing"
)

// writeFakeShell writes an executable script that stands in for the user's
// login shell. It ignores the -i/-l/-c arguments and runs body verbatim.
func writeFakeShell(t *testing.T, body string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "fakeshell")
	if err := os.WriteFile(path, []byte("#!/bin/sh\n"+body+"\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}

// TestResolveLoginShellPATH_MarkerParsedDespiteNonZeroExit verifies that a
// PATH printed before the shell fails is still adopted, with the common macOS
// directories appended, rather than discarded on the non-zero exit.
func TestResolveLoginShellPATH_MarkerParsedDespiteNonZeroExit(t *testing.T) {
	if goruntime.GOOS != "darwin" {
		t.Skip("resolveLoginShellPATH is a no-op outside macOS")
	}
	t.Setenv("HOME", "/Users/test")
	t.Setenv("PATH", "/usr/bin:/bin")
	shell := writeFakeShell(t, "echo 'rc banner'\necho '__galacius_path__:/fake/bin:/usr/bin'\nexit 3")

	resolveLoginShellPATH(shell)

	want := "/fake/bin:/usr/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/Users/test/.local/bin:/Users/test/bin"
	if got := os.Getenv("PATH"); got != want {
		t.Fatalf("PATH = %q; want %q", got, want)
	}
}

// TestResolveLoginShellPATH_FallsBackToCurrentPATH verifies that when no usable
// PATH can be read from the shell, the process PATH is kept and only the common
// directories are appended.
func TestResolveLoginShellPATH_FallsBackToCurrentPATH(t *testing.T) {
	if goruntime.GOOS != "darwin" {
		t.Skip("resolveLoginShellPATH is a no-op outside macOS")
	}

	tests := []struct {
		name    string
		body    string
		missing bool
	}{
		{
			name: "marker absent from output, exit 0",
			body: "echo 'rc banner'\nexit 0",
		},
		{
			name: "marker present with empty PATH value",
			body: "echo '__galacius_path__:'\nexit 0",
		},
		{
			name: "non-zero exit without marker",
			body: "exit 1",
		},
		{
			name:    "shell binary does not exist",
			missing: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("HOME", "/Users/test")
			t.Setenv("PATH", "/usr/bin:/bin")

			shell := filepath.Join(t.TempDir(), "does-not-exist")
			if !tt.missing {
				shell = writeFakeShell(t, tt.body)
			}

			resolveLoginShellPATH(shell)

			want := "/usr/bin:/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/Users/test/.local/bin:/Users/test/bin"
			if got := os.Getenv("PATH"); got != want {
				t.Fatalf("PATH = %q; want %q", got, want)
			}
		})
	}
}

// TestNewApp_TestVersionMarksPathResolved verifies that the "test" sentinel
// skips PATH resolution and pre-closes pathResolved, so Connect never blocks in
// unit tests waiting for a shell that is never spawned.
func TestNewApp_TestVersionMarksPathResolved(t *testing.T) {
	a := NewApp("test")

	select {
	case <-a.pathResolved:
	default:
		t.Fatal("expected pathResolved to be closed in test mode")
	}
}
