package plugin

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
)

func TestPluginLoaderStatus(t *testing.T) {
	t.Run("initial status is NOT_INSTALLED", func(t *testing.T) {
		pl := NewPluginLoader("test-helm", "/bin/true")
		if pl.Status() != dto.PluginStatusNotInstalled {
			t.Errorf("expected %q, got %q", dto.PluginStatusNotInstalled, pl.Status())
		}
	})
}

func TestPluginLoaderLockFile(t *testing.T) {
	t.Run("read non-existent lock file returns error", func(t *testing.T) {
		pl := NewPluginLoader("test-helm", "/bin/true")
		// Set a fake lock file path
		pl.lockFilePath = filepath.Join(t.TempDir(), "nonexistent.lock")
		data, err := pl.readLockFile()
		if err == nil {
			t.Errorf("expected error, got nil")
		}
		if data != nil {
			t.Errorf("expected nil data, got %v", data)
		}
	})

	t.Run("write and read lock file", func(t *testing.T) {
		tmpDir := t.TempDir()
		pl := NewPluginLoader("test-helm", "/bin/true")
		pl.lockFilePath = filepath.Join(tmpDir, "test.lock")

		// Write lock file
		if err := pl.writeLockFile(12345, 54321); err != nil {
			t.Fatalf("write lock file: %v", err)
		}

		// Verify file exists
		if _, err := os.Stat(pl.lockFilePath); err != nil {
			t.Fatalf("lock file not created: %v", err)
		}

		// Read it back
		data, err := pl.readLockFile()
		if err != nil {
			t.Fatalf("read lock file: %v", err)
		}
		if data == nil {
			t.Fatal("lock file data is nil")
		}
		if data.PID != 12345 {
			t.Errorf("expected PID 12345, got %d", data.PID)
		}
		if data.Port != 54321 {
			t.Errorf("expected Port 54321, got %d", data.Port)
		}
	})
}

func TestPluginLoaderHandshakeValidation(t *testing.T) {
	tests := []struct {
		name    string
		hs      map[string]any
		wantErr bool
	}{
		{
			name: "valid handshake",
			hs: map[string]any{
				"type":     "READY",
				"httpPort": 54321.0,
				"version":  "1.0.0",
			},
			wantErr: false,
		},
		{
			name: "missing httpPort",
			hs: map[string]any{
				"type":    "READY",
				"version": "1.0.0",
			},
			wantErr: true,
		},
		{
			name: "invalid type",
			hs: map[string]any{
				"type":     "INVALID",
				"httpPort": 54321.0,
			},
			wantErr: true,
		},
		{
			name: "port out of range (too low)",
			hs: map[string]any{
				"type":     "READY",
				"httpPort": 0.0,
			},
			wantErr: true,
		},
		{
			name: "port out of ephemeral range (too high)",
			hs: map[string]any{
				"type":     "READY",
				"httpPort": 65536.0,
			},
			wantErr: true,
		},
		{
			name: "httpPort in valid range",
			hs: map[string]any{
				"type":     "READY",
				"httpPort": 49152.0,
			},
			wantErr: false,
		},
		{
			name: "httpPort at upper bound",
			hs: map[string]any{
				"type":     "READY",
				"httpPort": 65535.0,
			},
			wantErr: false,
		},
		{
			name: "httpPort in Linux ephemeral range (32845 - original bug)",
			hs: map[string]any{
				"type":     "READY",
				"httpPort": 32845.0,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pl := NewPluginLoader("test", "/bin/true")
			err := pl.validateHandshake(tt.hs)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateHandshake error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestPluginStatusString(t *testing.T) {
	tests := []struct {
		status dto.PluginStatus
		want   string
	}{
		{dto.PluginStatusNotInstalled, "NOT_INSTALLED"},
		{dto.PluginStatusInstalling, "INSTALLING"},
		{dto.PluginStatusReady, "READY"},
		{dto.PluginStatusCrashed, "CRASHED"},
		{dto.PluginStatusIncompatible, "INCOMPATIBLE"},
	}

	for _, tt := range tests {
		if got := tt.status.String(); got != tt.want {
			t.Errorf("Status.String() = %q, want %q", got, tt.want)
		}
	}
}

func TestLockFileJSON(t *testing.T) {
	t.Run("lock file marshals/unmarshals correctly", func(t *testing.T) {
		original := dto.PluginLockFile{
			PID:       1234,
			Port:      54321,
			Timestamp: time.Date(2026, 7, 23, 12, 0, 0, 0, time.UTC).Format(time.RFC3339),
			Version:   "v1",
		}

		// Marshal
		data, err := json.MarshalIndent(original, "", "  ")
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}

		// Unmarshal
		var restored dto.PluginLockFile
		if err := json.Unmarshal(data, &restored); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}

		if restored.PID != original.PID {
			t.Errorf("PID mismatch: %d != %d", restored.PID, original.PID)
		}
		if restored.Port != original.Port {
			t.Errorf("Port mismatch: %d != %d", restored.Port, original.Port)
		}
		if restored.Version != original.Version {
			t.Errorf("Version mismatch: %q != %q", restored.Version, original.Version)
		}
	})
}

// Concurrent launch test would require a real binary; skipped here
// In a full implementation, use testdata/mock-plugin to spawn
func TestPluginLoaderConcurrency(t *testing.T) {
	t.Run("Status() is thread-safe", func(t *testing.T) {
		pl := NewPluginLoader("test", "/bin/true")
		done := make(chan bool)

		// Concurrent reads
		for range 10 {
			go func() {
				_ = pl.Status()
				done <- true
			}()
		}

		// Wait for all
		for range 10 {
			<-done
		}
	})
}

func TestHandshakeJSONParsing(t *testing.T) {
	t.Run("valid handshake JSON is parsed correctly", func(t *testing.T) {
		jsonLine := `{"type":"READY","version":"dev","httpPort":54321,"pid":1234,"timestamp":"2026-07-23T00:00:00Z"}`

		var handshake map[string]any
		if err := json.Unmarshal([]byte(jsonLine), &handshake); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}

		pl := NewPluginLoader("test", "/bin/true")
		if err := pl.validateHandshake(handshake); err != nil {
			t.Errorf("validate handshake: %v", err)
		}
	})

	t.Run("malformed JSON fails appropriately", func(t *testing.T) {
		jsonLine := `{"type":"READY","httpPort":65536}`

		var handshake map[string]any
		if err := json.Unmarshal([]byte(jsonLine), &handshake); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}

		pl := NewPluginLoader("test", "/bin/true")
		err := pl.validateHandshake(handshake)
		if err == nil {
			t.Error("expected validation error for out-of-range port")
		}
	})
}

func TestPluginStatusThreadSafety(t *testing.T) {
	pl := NewPluginLoader("test", "/bin/true")

	// Start goroutines that repeatedly call Status()
	errs := make(chan error, 20)
	for range 20 {
		go func() {
			for range 100 {
				_ = pl.Status()
			}
			errs <- nil
		}()
	}

	// Wait for all to complete
	for range 20 {
		<-errs
	}
}

func TestPluginLoaderProgress(t *testing.T) {
	t.Run("initial progress is 0", func(t *testing.T) {
		pl := NewPluginLoader("test-helm", "/bin/true")
		if pl.Progress() != 0 {
			t.Errorf("expected initial progress 0, got %d", pl.Progress())
		}
	})

	t.Run("SetProgress updates progress", func(t *testing.T) {
		pl := NewPluginLoader("test-helm", "/bin/true")
		pl.SetProgress(50)
		if pl.Progress() != 50 {
			t.Errorf("expected progress 50, got %d", pl.Progress())
		}

		pl.SetProgress(100)
		if pl.Progress() != 100 {
			t.Errorf("expected progress 100, got %d", pl.Progress())
		}
	})

	t.Run("SetStatus resets progress to 0 by default", func(t *testing.T) {
		pl := NewPluginLoader("test-helm", "/bin/true")
		pl.SetProgress(75)
		pl.SetStatus(dto.PluginStatusInstalling)
		if pl.Progress() != 0 {
			t.Errorf("expected progress reset to 0, got %d", pl.Progress())
		}
	})

	t.Run("SetStatus sets progress to 100 when status is READY", func(t *testing.T) {
		pl := NewPluginLoader("test-helm", "/bin/true")
		pl.SetProgress(50)
		pl.SetStatus(dto.PluginStatusReady)
		if pl.Progress() != 100 {
			t.Errorf("expected progress 100 for READY status, got %d", pl.Progress())
		}
	})

	t.Run("SetStatusWithError resets progress to 0", func(t *testing.T) {
		pl := NewPluginLoader("test-helm", "/bin/true")
		pl.SetProgress(75)
		pl.SetStatusWithError(dto.PluginStatusCrashed, "test error")
		if pl.Progress() != 0 {
			t.Errorf("expected progress reset to 0, got %d", pl.Progress())
		}
	})

	t.Run("Progress is thread-safe", func(t *testing.T) {
		pl := NewPluginLoader("test", "/bin/true")
		done := make(chan bool, 20)

		// Concurrent writes and reads
		for i := range 10 {
			go func(idx int) {
				pl.SetProgress(idx * 10)
				done <- true
			}(i)
		}

		for range 10 {
			go func() {
				_ = pl.Progress()
				done <- true
			}()
		}

		// Wait for all
		for range 20 {
			<-done
		}
	})
}

func TestHandshakeReadGoroutineReturnsPromptly(t *testing.T) {
	// Regression test for Bug 1: handshake-reading goroutine must NOT block on io.ReadAll
	// It should read only the first line and return immediately, allowing the plugin process
	// to keep running for the entire connection lifetime.
	//
	// This test verifies that a mock plugin emitting ONE handshake line then sleeping
	// does NOT cause Launch() to hang forever.

	tmpDir := t.TempDir()
	binPath := filepath.Join(tmpDir, "mock-plugin-sleeper")

	// Write a shell script that emits the handshake once, then sleeps (simulating long-running plugin)
	script := `#!/bin/bash
echo '{"type":"READY","version":"test","httpPort":54321}'
# Simulate long-running plugin that never closes stdout
sleep 3600
`

	if err := os.WriteFile(binPath, []byte(script), 0755); err != nil {
		t.Fatalf("write mock plugin: %v", err)
	}

	pl := NewPluginLoader("test-helm", binPath)
	pl.lockFilePath = filepath.Join(tmpDir, "test.lock")

	// Launch reads the handshake, stores the HTTP port, and returns — there is no
	// network dial anymore, so this should complete almost immediately. We assert
	// this by checking that Launch returns in a reasonable timeframe (<5s).
	start := time.Now()

	if err := pl.Launch(context.Background(), ""); err != nil {
		t.Fatalf("Launch: %v", err)
	}

	elapsed := time.Since(start)

	// If we had the old io.ReadAll bug, this would hang for the process lifetime (3600s+).
	if elapsed > 10*time.Second {
		t.Errorf("Launch took too long: %v; may indicate goroutine is blocked on stdout pipe", elapsed)
	}

	// Ensure process is cleaned up
	pl.Shutdown()
}

// TestPluginLoaderClientNilAfterRestore verifies the root cause fix:
// A plugin restored as READY (by restoreInstalledPlugins) is not yet alive
// (no subprocess has been launched) until Launch() is explicitly called.
func TestPluginLoaderClientNilAfterRestore(t *testing.T) {
	t.Run("SetStatus(READY) does not launch subprocess", func(t *testing.T) {
		pl := NewPluginLoader("test-helm", "/bin/true")

		// Simulate what restoreInstalledPlugins does
		pl.SetStatus(dto.PluginStatusReady)

		// No subprocess has been launched, so liveness must be false.
		if pl.IsAlive() {
			t.Error("expected not alive after SetStatus(READY) without Launch()")
		}

		// Status must be READY
		if pl.Status() != dto.PluginStatusReady {
			t.Errorf("expected status READY, got %q", pl.Status())
		}
	})
}

// TestPluginLoaderShutdownResetsState verifies the fix for the stale state bug:
// After Shutdown(), the loader must report IsAlive() == false and Status() == NOT_INSTALLED,
// allowing the loader to be reused for a fresh install without stale state.
func TestPluginLoaderShutdownResetsState(t *testing.T) {
	tmpDir := t.TempDir()
	binPath := filepath.Join(tmpDir, "mock-plugin-simple")

	// Write a simple shell script that emits the handshake once
	script := `#!/bin/bash
echo '{"type":"READY","version":"test","httpPort":54321}'
# Keep running (plugin daemon)
sleep 3600
`

	if err := os.WriteFile(binPath, []byte(script), 0755); err != nil {
		t.Fatalf("write mock plugin: %v", err)
	}

	pl := NewPluginLoader("test-helm", binPath)
	pl.lockFilePath = filepath.Join(tmpDir, "test.lock")

	// Launch the plugin successfully
	if err := pl.Launch(context.Background(), ""); err != nil {
		t.Fatalf("Launch: %v", err)
	}

	// Verify it's alive and READY after successful Launch
	if !pl.IsAlive() {
		t.Error("expected IsAlive() == true after successful Launch()")
	}
	if pl.Status() != dto.PluginStatusReady {
		t.Errorf("expected status READY after Launch, got %q", pl.Status())
	}

	// Now shutdown
	if err := pl.Shutdown(); err != nil {
		t.Fatalf("Shutdown: %v", err)
	}

	// Verify state is fully reset: not alive and NOT_INSTALLED
	if pl.IsAlive() {
		t.Error("expected IsAlive() == false after Shutdown()")
	}
	if pl.Status() != dto.PluginStatusNotInstalled {
		t.Errorf("expected status NOT_INSTALLED after Shutdown, got %q", pl.Status())
	}
	if pl.LastError() != "" {
		t.Errorf("expected empty lastError after Shutdown, got %q", pl.LastError())
	}
}

// TestPluginLoaderShutdownThenRelaunch verifies that a loader can be reused
// after Shutdown(). This confirms the state reset is complete and the loader
// is ready for a fresh install/launch cycle (e.g., during plugin reinstall).
func TestPluginLoaderShutdownThenRelaunch(t *testing.T) {
	tmpDir := t.TempDir()
	binPath := filepath.Join(tmpDir, "mock-plugin-relaunch")

	// Write a simple shell script that emits the handshake once
	script := `#!/bin/bash
echo '{"type":"READY","version":"test","httpPort":54321}'
# Keep running (plugin daemon)
sleep 3600
`

	if err := os.WriteFile(binPath, []byte(script), 0755); err != nil {
		t.Fatalf("write mock plugin: %v", err)
	}

	pl := NewPluginLoader("test-helm", binPath)
	pl.lockFilePath = filepath.Join(tmpDir, "test.lock")

	// First launch
	if err := pl.Launch(context.Background(), ""); err != nil {
		t.Fatalf("first Launch: %v", err)
	}
	if !pl.IsAlive() {
		t.Error("expected IsAlive() == true after first Launch()")
	}

	// Shutdown
	if err := pl.Shutdown(); err != nil {
		t.Fatalf("Shutdown: %v", err)
	}
	if pl.IsAlive() {
		t.Error("expected IsAlive() == false after Shutdown()")
	}

	// Attempt relaunch (e.g., user reinstalls the plugin)
	if err := pl.Launch(context.Background(), ""); err != nil {
		t.Fatalf("second Launch after Shutdown: %v", err)
	}
	if !pl.IsAlive() {
		t.Error("expected IsAlive() == true after second Launch()")
	}
	if pl.Status() != dto.PluginStatusReady {
		t.Errorf("expected status READY after second Launch, got %q", pl.Status())
	}

	// Clean up
	pl.Shutdown()
}

// TestPluginLoaderSetStatusNotReadyAfterError verifies that SetStatus does not
// accidentally set READY when an error occurs during operations (regression test
// for the original bug where InstallPlugin ignored Launch errors).
func TestPluginLoaderSetStatusNotReadyAfterError(t *testing.T) {
	pl := NewPluginLoader("test-helm", "/bin/nonexistent")
	pl.lockFilePath = filepath.Join(t.TempDir(), "test.lock")

	// Attempt Launch with non-existent binary (will fail)
	err := pl.Launch(context.Background(), "")
	if err == nil {
		t.Fatalf("expected Launch error with non-existent binary, got nil")
	}

	// Verify that failed Launch sets status to CRASHED, not READY
	status := pl.Status()
	if status != dto.PluginStatusCrashed {
		t.Errorf("expected status CRASHED after failed Launch, got %q", status)
	}

	// Verify there is a lastError recorded
	if pl.LastError() == "" {
		t.Error("expected lastError to be set after failed Launch")
	}

	// IsAlive should be false (no process running)
	if pl.IsAlive() {
		t.Error("expected IsAlive() == false after failed Launch")
	}
}

// TestPluginLoaderKillsOrphanedProcessNotOwnedByThisInstance is a regression
// test for the bug where Launch() reused any lock file with a live PID,
// regardless of whether this loader instance had ever spawned it. That
// happens on every fresh host process (e.g. a wails-dev hot-reload restart
// that never ran the old process through App.Shutdown()): the on-disk lock
// file survives, still pointing at the previous host session's plugin
// subprocess, which dialed the previous host's gRPC server (a fresh
// ephemeral port + fresh in-memory AuthTokenManager every restart, per
// NewGRPCServerConfig) and can never reconnect. Reusing it silently broke
// the plugin's pub/sub event channel (helm:install:complete, etc.) while its
// HTTP server kept responding fine, masking the failure entirely. Launch()
// must instead recognize it does not own that PID, kill it, and spawn fresh.
func TestPluginLoaderKillsOrphanedProcessNotOwnedByThisInstance(t *testing.T) {
	tmpDir := t.TempDir()

	// Simulate an "orphan": a long-lived process this test process did not
	// spawn via any PluginLoader (standing in for a previous host session's
	// plugin subprocess that survived a host restart).
	orphan := exec.Command("sleep", "3600")
	if err := orphan.Start(); err != nil {
		t.Fatalf("start orphan process: %v", err)
	}
	orphanPID := orphan.Process.Pid
	defer func() {
		_ = orphan.Process.Kill()
		_ = orphan.Wait()
	}()

	binPath := filepath.Join(tmpDir, "mock-plugin-fresh")
	script := `#!/bin/bash
echo '{"type":"READY","version":"test","httpPort":54321}'
sleep 3600
`
	if err := os.WriteFile(binPath, []byte(script), 0755); err != nil {
		t.Fatalf("write mock plugin: %v", err)
	}

	pl := NewPluginLoader("test-helm", binPath)
	pl.lockFilePath = filepath.Join(tmpDir, "test.lock")
	defer pl.Shutdown()

	// Plant a lock file pointing at the orphan, as if a previous host
	// session had launched and left it running.
	if err := pl.writeLockFile(orphanPID, 54321); err != nil {
		t.Fatalf("write lock file: %v", err)
	}

	// This is the FIRST Launch() call on this fresh loader instance — it
	// never spawned orphanPID itself, so it must not adopt it.
	if err := pl.Launch(context.Background(), ""); err != nil {
		t.Fatalf("Launch: %v", err)
	}

	if pl.pid == orphanPID {
		t.Fatalf("Launch() adopted the orphaned PID %d instead of spawning a fresh process", orphanPID)
	}
	if !pl.IsAlive() {
		t.Error("expected IsAlive() == true after Launch spawned a fresh process")
	}

	// The orphan must have been killed, not left running and forgotten.
	if err := orphan.Wait(); err == nil {
		t.Error("expected orphan process to have been killed by Launch(), but it exited cleanly on its own")
	}
	if isProcessAlive(orphanPID) {
		t.Errorf("expected orphan process %d to be killed, but it is still alive", orphanPID)
	}
}
