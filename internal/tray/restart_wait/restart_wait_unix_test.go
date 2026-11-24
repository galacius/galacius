//go:build !windows

package restartwait

import (
	"os"
	"os/exec"
	"testing"
	"time"
)

func TestWaitForProcessExit_ExitedProcessReturnsPromptly(t *testing.T) {
	cmd := exec.Command("true")
	if err := cmd.Run(); err != nil {
		t.Fatalf("run child: %v", err)
	}

	start := time.Now()
	if !waitForProcessExit(cmd.Process.Pid, time.Second) {
		t.Error("waitForProcessExit = false for an exited process, want true")
	}
	if elapsed := time.Since(start); elapsed > 500*time.Millisecond {
		t.Errorf("waited %s for an exited process, want prompt return", elapsed)
	}
}

func TestProcessAlive(t *testing.T) {
	if !processAlive(os.Getpid()) {
		t.Error("processAlive(self) = false, want true")
	}
	if processAlive(exitedPID(t)) {
		t.Error("processAlive(exited child) = true, want false")
	}
}

func TestWaitForProcessExit_TimeoutCapped(t *testing.T) {
	// The test process itself is always alive, so the wait must hit the timeout and report false.
	timeout := 150 * time.Millisecond

	start := time.Now()
	if waitForProcessExit(os.Getpid(), timeout) {
		t.Error("waitForProcessExit = true for a live process, want false")
	}
	if elapsed := time.Since(start); elapsed < timeout || elapsed > timeout+time.Second {
		t.Errorf("waited %s, want roughly %s", elapsed, timeout)
	}
}
