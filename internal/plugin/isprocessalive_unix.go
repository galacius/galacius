//go:build !windows

package plugin

import "syscall"

// isProcessAlive checks if a process ID is still alive using Unix/Linux/macOS syscalls
// Uses syscall.Kill(pid, 0) which sends signal 0 to check process existence without actually sending a signal
func isProcessAlive(pid int) bool {
	// err == nil means process exists and is signalable
	// err == syscall.ESRCH means no such process
	// err == syscall.EPERM means process exists but we don't have permission to signal it
	// (we treat EPERM as "alive" since the process exists)
	err := syscall.Kill(pid, 0)
	return err == nil || err == syscall.EPERM
}
