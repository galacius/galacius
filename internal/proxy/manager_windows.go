//go:build windows

package proxy

import (
	"log"
	"os/exec"
)

func setProcessGroup(cmd *exec.Cmd) {
	// Windows doesn't support process groups the same way Unix does.
	// No special setup needed; Kill() will only kill the script process itself.
}

func killProcessGroup(cmd *exec.Cmd) {
	if cmd == nil || cmd.Process == nil {
		return
	}

	if err := cmd.Process.Kill(); err != nil {
		log.Printf("error killing process %d: %v (MVP limitation: Windows only kills script, not its children)", cmd.Process.Pid, err)
	}
}
