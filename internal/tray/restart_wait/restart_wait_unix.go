//go:build !windows

package restartwait

import (
	"syscall"
	"time"
)

// waitForProcessExit polls until pid is gone or timeout elapses. It reports whether the process exited in time.
func waitForProcessExit(pid int, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for processAlive(pid) {
		if time.Now().After(deadline) {
			return false
		}
		time.Sleep(50 * time.Millisecond)
	}
	return true
}

// processAlive reports whether pid exists. EPERM means it exists but belongs to another user.
func processAlive(pid int) bool {
	err := syscall.Kill(pid, 0)
	return err == nil || err == syscall.EPERM
}
