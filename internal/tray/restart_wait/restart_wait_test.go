package restartwait

import (
	"os"
	"os/exec"
	"strconv"
	"testing"
	"time"
)

// exitedPID runs a test binary that matches no tests, so it exits immediately, and returns its reaped PID.
func exitedPID(t *testing.T) int {
	t.Helper()
	cmd := exec.Command(os.Args[0], "-test.run=^$")
	if err := cmd.Run(); err != nil {
		t.Fatalf("run child: %v", err)
	}
	return cmd.Process.Pid
}

func TestWaitForRestartParent_InvalidOrMissingEnvReturnsImmediately(t *testing.T) {
	tests := []struct {
		name  string
		value string
		set   bool
	}{
		{name: "unset", set: false},
		{name: "empty", value: "", set: true},
		{name: "not a number", value: "abc", set: true},
		{name: "zero", value: "0", set: true},
		{name: "negative", value: "-1", set: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// t.Setenv restores the original value at cleanup; the Unsetenv covers the unset case.
			t.Setenv(RestartParentPIDEnv, tt.value)
			if !tt.set {
				os.Unsetenv(RestartParentPIDEnv)
			}

			start := time.Now()
			WaitForRestartParent()

			if elapsed := time.Since(start); elapsed > 500*time.Millisecond {
				t.Errorf("waited %s for %s env, want immediate return", elapsed, tt.name)
			}
			if _, ok := os.LookupEnv(RestartParentPIDEnv); ok {
				t.Error("env var still set after WaitForRestartParent, want it cleared")
			}
		})
	}
}

func TestWaitForRestartParent_ExitedParentReturnsPromptlyAndClearsEnv(t *testing.T) {
	t.Setenv(RestartParentPIDEnv, strconv.Itoa(exitedPID(t)))

	start := time.Now()
	WaitForRestartParent()

	if elapsed := time.Since(start); elapsed > time.Second {
		t.Errorf("waited %s for an exited parent, want prompt return", elapsed)
	}
	if _, ok := os.LookupEnv(RestartParentPIDEnv); ok {
		t.Error("env var still set after WaitForRestartParent, want it cleared")
	}
}
