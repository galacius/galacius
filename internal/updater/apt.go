package updater

import (
	"context"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"
)

var (
	aptCheckOnce       sync.Once
	cachedIsAptManaged bool
)

// IsAptManagedInstall checks whether the current executable is managed by
// the system's apt package manager. Result is cached for the process lifetime.
func IsAptManagedInstall(binaryPath string) bool {
	if runtime.GOOS != "linux" {
		return false
	}
	aptCheckOnce.Do(func() {
		cachedIsAptManaged = checkAptManagedOnce(binaryPath)
	})
	return cachedIsAptManaged
}

// checkAptManagedOnce attempts to detect if the binary is managed by apt.
// It tries dpkg-query first, then dpkg -S as a fallback.
// Each command is bounded by a 2-second timeout.
func checkAptManagedOnce(binaryPath string) bool {
	// Try dpkg-query first
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "dpkg-query", "-W", "-f=${Package}", "--search", binaryPath)
	if out, err := cmd.CombinedOutput(); err == nil && strings.TrimSpace(string(out)) == "galacius" {
		return true
	}

	// Fallback to dpkg -S
	ctx2, cancel2 := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel2()
	cmd2 := exec.CommandContext(ctx2, "dpkg", "-S", binaryPath)
	if out, err := cmd2.CombinedOutput(); err == nil {
		parts := strings.SplitN(strings.TrimSpace(string(out)), ":", 2)
		if len(parts) > 0 && parts[0] == "galacius" {
			return true
		}
	}

	// dpkg unavailable, timed out, or not owned by galacius — fall back to normal self-update
	return false
}
