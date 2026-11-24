//go:build windows

package restartwait

import (
	"time"

	"golang.org/x/sys/windows"
)

// waitForProcessExit blocks until pid exits or timeout elapses. It reports whether the process exited in time.
func waitForProcessExit(pid int, timeout time.Duration) bool {
	handle, err := windows.OpenProcess(windows.SYNCHRONIZE, false, uint32(pid))
	if err != nil {
		// The process is already gone (or inaccessible), so there is nothing to wait for.
		return true
	}
	defer windows.CloseHandle(handle)

	event, err := windows.WaitForSingleObject(handle, uint32(timeout/time.Millisecond))
	return err == nil && event == windows.WAIT_OBJECT_0
}
