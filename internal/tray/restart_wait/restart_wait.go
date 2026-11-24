package restartwait

import (
	"log"
	"os"
	"strconv"
	"time"
)

// RestartParentPIDEnv carries the PID of the process that spawned a relaunch, so the child can wait for it to exit
// before taking the single-instance lock. app.RestartApp sets it; main reads it via WaitForRestartParent.
const RestartParentPIDEnv = "GALACIUS_RESTART_PARENT_PID"

// restartParentWaitTimeout caps how long a relaunched process waits for the one that spawned it to exit.
const restartParentWaitTimeout = 5 * time.Second

// WaitForRestartParent blocks until the process that relaunched us (app.RestartApp) has exited. The child must not
// take the single-instance lock while the parent still holds it, or it would hand off and exit instead of starting.
// The env var is cleared so it doesn't leak into anything this process spawns.
func WaitForRestartParent() {
	raw, ok := os.LookupEnv(RestartParentPIDEnv)
	if !ok {
		return
	}
	os.Unsetenv(RestartParentPIDEnv)

	pid, err := strconv.Atoi(raw)
	if err != nil || pid <= 0 {
		return
	}
	if !waitForProcessExit(pid, restartParentWaitTimeout) {
		log.Printf("main: restart: parent process %d still running after %s, continuing", pid, restartParentWaitTimeout)
	}
}
