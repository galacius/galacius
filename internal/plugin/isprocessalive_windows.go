//go:build windows

package plugin

import "golang.org/x/sys/windows"

// isProcessAlive checks if a process ID is still alive on Windows
// Uses Windows OpenProcess API to verify process existence
func isProcessAlive(pid int) bool {
	// OpenProcess with PROCESS_QUERY_LIMITED_INFORMATION access right
	// This allows checking if a process is alive without requiring full permissions
	handle, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, uint32(pid))
	if err != nil {
		// If we can't open the process, it doesn't exist
		return false
	}
	defer windows.CloseHandle(handle)

	// Try GetExitCodeProcess to verify the handle is valid and process is alive
	var exitCode uint32
	err = windows.GetExitCodeProcess(handle, &exitCode)
	if err != nil {
		return false
	}

	// STILL_ACTIVE = 259 (0x103) means the process is still running
	return exitCode == 259
}
