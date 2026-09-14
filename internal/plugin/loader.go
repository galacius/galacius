package plugin

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
)

// TokenManager is an interface for managing authentication tokens.
// It abstracts away the gRPC server dependency.
type TokenManager interface {
	RegisterToken(token, pluginID string)
	RemoveToken(token string)
}

// PluginLoader manages a single plugin instance lifecycle
type PluginLoader struct {
	id           string
	binaryPath   string
	lockFilePath string
	mu           sync.Mutex // protects the fields below; held only briefly, never across blocking I/O
	launchMu     sync.Mutex // serializes Launch()/Shutdown() calls for this loader; may be held for the full spawn+handshake duration, but that must never block a mu-only reader like Status()/Progress()
	status       dto.PluginStatus
	progress     int // 0-100 download progress
	pid          int // plugin subprocess PID, used for on-demand liveness checks
	processCmd   *exec.Cmd
	lastError    string
	hostGRPCPort int          // host's gRPC port for cluster context watch (0 = not set)
	tokenManager TokenManager // manages authentication tokens (optional)
	authToken    string       // current auth token for this plugin instance
}

// NewPluginLoader creates a new loader for a plugin. The lock file lives
// alongside the binary (i.e. under the caller's configured plugins root),
// not a hardcoded default — otherwise switching to a custom plugins
// directory would leave lock-file lookups pointed at the old location,
// letting Launch() reuse a stale process from a completely different
// directory (Launch only verifies PID-liveness, never that the process was
// spawned from the currently configured binary).
func NewPluginLoader(id string, binaryPath string) *PluginLoader {
	lockDir := filepath.Dir(binaryPath)
	lockFile := filepath.Join(lockDir, id+".lock")
	return &PluginLoader{
		id:           id,
		binaryPath:   binaryPath,
		lockFilePath: lockFile,
		status:       dto.PluginStatusNotInstalled,
	}
}

// Launch starts or reuses a plugin instance with an optional kubeconfig path.
//
// Spawning the subprocess and waiting on its handshake is slow (process
// start, macOS Gatekeeper's first-execution scan of a freshly-downloaded
// binary, up to the 5s handshake timeout below) — potentially multiple
// seconds. Only launchMu is held across that work; pl.mu is taken briefly
// and released around each individual field read/write, so Status(),
// Progress(), HTTPPort(), etc. never block behind an in-flight Launch().
// launchMu itself still serializes concurrent Launch()/Shutdown() calls for
// this loader, so only one subprocess is ever spawned at a time.
func (pl *PluginLoader) Launch(ctx context.Context, kubeconfigPath string) error {
	pl.launchMu.Lock()
	defer pl.launchMu.Unlock()

	// Check if lock file exists with a live process. Liveness is PID-only —
	// there is no network health check here; App.GetPluginBackendAddr does an
	// on-demand TCP dial check before returning an address and relaunches if
	// the process is alive but its HTTP listener isn't responding.
	//
	// Reuse is only valid if THIS loader instance is the one that spawned that
	// PID (pl.processCmd tracks the *exec.Cmd from our own cmd.Start() call).
	// A lock file surviving a full host-process restart (e.g. wails dev's
	// hot-reload, which doesn't run the old process through App.Shutdown())
	// points at an orphan: it dialed the *previous* host's gRPC server, which
	// no longer exists — every restart binds a fresh ephemeral port
	// (NewGRPCServerConfig listens on "127.0.0.1:0") and a fresh in-memory
	// AuthTokenManager, so the orphan's pub/sub connection is permanently
	// dead even though the OS process itself is still alive. Blindly reusing
	// it (as before) left the plugin's HTTP calls working (unaffected by
	// gRPC) while every Publish()-driven event silently vanished. Kill the
	// orphan and fall through to a fresh spawn instead of adopting it.
	if lockData, err := pl.readLockFile(); err == nil && lockData != nil {
		pl.mu.Lock()
		ownedByUs := pl.processCmd != nil && pl.processCmd.Process != nil && pl.processCmd.Process.Pid == lockData.PID
		pl.mu.Unlock()
		alive := isProcessAlive(lockData.PID)
		if ownedByUs && alive {
			pl.mu.Lock()
			pl.pid = lockData.PID
			pl.status = dto.PluginStatusReady
			pl.mu.Unlock()
			return nil
		}
		if alive && !ownedByUs {
			if proc, findErr := os.FindProcess(lockData.PID); findErr == nil {
				proc.Kill()
			}
		}
		// Stale (dead, or orphaned-and-just-killed) lock; delete it.
		if err := os.Remove(pl.lockFilePath); err != nil && !os.IsNotExist(err) {
			fmt.Printf("plugin %q: failed to remove stale lock file %q: %v\n", pl.id, pl.lockFilePath, err)
		}
	}

	// Spawn plugin process with kubeconfig argument
	args := []string{}
	if kubeconfigPath != "" {
		args = append(args, "-kubeconfig", kubeconfigPath)
	}
	cmd := exec.CommandContext(ctx, pl.binaryPath, args...)

	pl.mu.Lock()
	hostGRPCPort := pl.hostGRPCPort
	pl.mu.Unlock()
	if hostGRPCPort > 0 {
		cmd.Env = append(os.Environ(), fmt.Sprintf("GALACIUS_HOST_GRPC_PORT=%d", hostGRPCPort))
	}

	// Log the command being launched for troubleshooting
	fmt.Printf("launching plugin %s with args %v\n", pl.binaryPath, cmd.Args)

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		pl.setStatus(dto.PluginStatusCrashed, fmt.Sprintf("stdout pipe: %v", err))
		return fmt.Errorf("plugin launch failed: %w", err)
	}

	// Set up stdin pipe for token delivery
	stdinPipe, err := cmd.StdinPipe()
	if err != nil {
		pl.setStatus(dto.PluginStatusCrashed, fmt.Sprintf("stdin pipe: %v", err))
		return fmt.Errorf("plugin launch failed: %w", err)
	}

	if err := cmd.Start(); err != nil {
		pl.setStatus(dto.PluginStatusCrashed, fmt.Sprintf("start process: %v", err))
		return fmt.Errorf("plugin start failed: %w", err)
	}

	pl.mu.Lock()
	pl.processCmd = cmd
	// Remove any stale token from a previous run (e.g. crash-relaunch) before
	// registering a new one — an old token must not remain valid indefinitely
	// once its process is gone.
	tokenManager := pl.tokenManager
	staleToken := pl.authToken
	pl.authToken = ""
	pl.mu.Unlock()
	if tokenManager != nil && staleToken != "" {
		tokenManager.RemoveToken(staleToken)
	}

	// Generate and register authentication token before delivering it to the plugin.
	// This token is a security credential and must use crypto/rand.
	authToken, err := generateAuthToken()
	if err != nil {
		_ = cmd.Process.Kill()
		pl.setStatus(dto.PluginStatusCrashed, fmt.Sprintf("generate auth token: %v", err))
		return fmt.Errorf("generate auth token: %w", err)
	}
	pl.mu.Lock()
	pl.authToken = authToken
	pl.mu.Unlock()

	// Register token before starting the plugin so it can authenticate immediately.
	if tokenManager != nil {
		tokenManager.RegisterToken(authToken, pl.id)
	}

	// Write token to plugin's stdin and close stdin.
	// This must happen before waiting on the handshake (separate pipes, no ordering dependency).
	go func() {
		defer stdinPipe.Close()
		_, _ = io.WriteString(stdinPipe, authToken+"\n")
	}()

	// Read handshake within 5s timeout
	readCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	handshakeCh := make(chan map[string]any, 1)
	errCh := make(chan error, 1)

	go func() {
		reader := bufio.NewReader(stdoutPipe)
		line, err := reader.ReadString('\n')
		if err != nil {
			errCh <- fmt.Errorf("read stdout: %w", err)
			return
		}
		if len(line) == 0 {
			errCh <- fmt.Errorf("no output from plugin")
			return
		}
		var handshake map[string]any
		if err := json.Unmarshal([]byte(line), &handshake); err != nil {
			errCh <- fmt.Errorf("parse handshake: %w", err)
			return
		}
		handshakeCh <- handshake
	}()

	select {
	case <-readCtx.Done():
		_ = cmd.Process.Kill()
		pl.setStatus(dto.PluginStatusCrashed, "handshake timeout (5s)")
		return fmt.Errorf("plugin handshake timeout")
	case err := <-errCh:
		_ = cmd.Process.Kill()
		pl.setStatus(dto.PluginStatusCrashed, err.Error())
		return fmt.Errorf("read handshake: %w", err)
	case handshake := <-handshakeCh:
		if err := pl.validateHandshake(handshake); err != nil {
			_ = cmd.Process.Kill()
			pl.setStatus(dto.PluginStatusCrashed, err.Error())
			return err
		}

		// Extract HTTP port (required)
		httpPort := int(handshake["httpPort"].(float64))

		// Write lock file
		if err := pl.writeLockFile(cmd.Process.Pid, httpPort); err != nil {
			_ = cmd.Process.Kill()
			pl.setStatus(dto.PluginStatusCrashed, fmt.Sprintf("write lock file: %v", err))
			return err
		}

		pl.mu.Lock()
		pl.pid = cmd.Process.Pid
		pl.status = dto.PluginStatusReady
		pl.mu.Unlock()
		return nil
	}
}

// setStatus records a crashed/errored status under pl.mu. Small helper so
// each Launch() error path doesn't need its own lock/unlock pair.
func (pl *PluginLoader) setStatus(status dto.PluginStatus, errMsg string) {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	pl.status = status
	pl.lastError = errMsg
}

// validateHandshake checks the handshake JSON for required fields and valid port.
func (pl *PluginLoader) validateHandshake(handshake map[string]any) error {
	if handshake["type"] != "READY" {
		return fmt.Errorf("invalid handshake type: %v", handshake["type"])
	}
	if _, ok := handshake["httpPort"]; !ok {
		return fmt.Errorf("missing httpPort in handshake")
	}
	port, ok := handshake["httpPort"].(float64)
	if !ok {
		return fmt.Errorf("invalid httpPort type")
	}
	portInt := int(port)
	if portInt < 1 || portInt > 65535 {
		return fmt.Errorf("httpPort out of range: %d", portInt)
	}
	return nil
}

// readLockFile reads and parses the lock file
func (pl *PluginLoader) readLockFile() (*dto.PluginLockFile, error) {
	data, err := os.ReadFile(pl.lockFilePath)
	if err != nil {
		return nil, err
	}
	var lockFile dto.PluginLockFile
	if err := json.Unmarshal(data, &lockFile); err != nil {
		return nil, err
	}
	return &lockFile, nil
}

// writeLockFile writes the lock file
func (pl *PluginLoader) writeLockFile(pid, port int) error {
	lockDir := filepath.Dir(pl.lockFilePath)
	if err := os.MkdirAll(lockDir, 0700); err != nil {
		return err
	}
	lockFile := dto.PluginLockFile{
		PID:       pid,
		Port:      port,
		Timestamp: time.Now().Format(time.RFC3339),
		Version:   "v1",
	}
	data, _ := json.MarshalIndent(lockFile, "", "  ")
	return os.WriteFile(pl.lockFilePath, data, 0600)
}

// Status returns the current plugin status (thread-safe)
func (pl *PluginLoader) Status() dto.PluginStatus {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	return pl.status
}

// LastError returns the last recorded error message (thread-safe)
func (pl *PluginLoader) LastError() string {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	return pl.lastError
}

// Progress returns the current download progress as a percentage (0-100) (thread-safe)
func (pl *PluginLoader) Progress() int {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	return pl.progress
}

// SetProgress sets the download progress as a percentage (0-100) (thread-safe)
func (pl *PluginLoader) SetProgress(pct int) {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	pl.progress = pct
}

// SetStatus sets the plugin status (thread-safe); resets progress to 0 except for READY status
func (pl *PluginLoader) SetStatus(status dto.PluginStatus) {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	pl.status = status
	pl.lastError = ""
	// Set progress to 100 when status is READY, otherwise reset to 0
	if status == dto.PluginStatusReady {
		pl.progress = 100
	} else {
		pl.progress = 0
	}
}

// SetStatusWithError sets the plugin status with an error message (thread-safe); resets progress to 0
func (pl *PluginLoader) SetStatusWithError(status dto.PluginStatus, errMsg string) {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	pl.status = status
	pl.lastError = errMsg
	pl.progress = 0
}

// BinaryPath returns the path to the plugin binary
func (pl *PluginLoader) BinaryPath() string {
	return pl.binaryPath
}

// SetBinaryPath sets the path to the plugin binary (thread-safe).
// Used when the real binary path is determined after loader creation.
func (pl *PluginLoader) SetBinaryPath(binaryPath string) {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	pl.binaryPath = binaryPath
	// Update lock file path to match the new binary location
	pl.lockFilePath = filepath.Join(filepath.Dir(binaryPath), pl.id+".lock")
}

// IsAlive reports whether the plugin's subprocess PID is still alive. Liveness
// is PID-only — there is no network health check here. For a complete health check
// that detects alive processes with unresponsive HTTP listeners, see
// App.GetPluginBackendAddr in internal/app/plugin.go.
func (pl *PluginLoader) IsAlive() bool {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	return pl.pid != 0 && isProcessAlive(pl.pid)
}

// HTTPPort reads and returns the plugin's HTTP backend port from the lock file.
// Returns an error if the lock file cannot be read or is invalid.
func (pl *PluginLoader) HTTPPort() (int, error) {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	lockData, err := pl.readLockFile()
	if err != nil {
		return 0, err
	}
	return lockData.Port, nil
}

// SetHostGRPCPort sets the host's gRPC port for cluster context watch (thread-safe)
func (pl *PluginLoader) SetHostGRPCPort(port int) {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	pl.hostGRPCPort = port
}

// SetTokenManager sets the token manager for this plugin loader (thread-safe)
func (pl *PluginLoader) SetTokenManager(tm TokenManager) {
	pl.mu.Lock()
	defer pl.mu.Unlock()
	pl.tokenManager = tm
}

// generateAuthToken generates a 32-byte authentication token, hex-encoded to 64 characters.
// It uses crypto/rand which is required for security-sensitive credentials.
func generateAuthToken() (string, error) {
	// Generate 32 random bytes (crypto/rand required — do not downgrade to math/rand,
	// token is a security credential).
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("generate random token: %w", err)
	}
	// Hex-encode the bytes to get a 64-character string.
	return hex.EncodeToString(tokenBytes), nil
}

// Shutdown cleanly shuts down the plugin. Takes launchMu first so it can't
// race an in-flight Launch() (e.g. killing a process Launch is still
// handshaking with, then having Launch report it Ready again afterward);
// pl.mu is only held briefly around field access, never across the blocking
// Kill()/Wait(), so Status()/Progress() reads aren't held up by shutdown.
func (pl *PluginLoader) Shutdown() error {
	pl.launchMu.Lock()
	defer pl.launchMu.Unlock()

	pl.mu.Lock()
	cmd := pl.processCmd
	tokenManager := pl.tokenManager
	authToken := pl.authToken
	pl.mu.Unlock()

	if cmd != nil && cmd.Process != nil {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	}

	// Remove the authentication token
	if tokenManager != nil && authToken != "" {
		tokenManager.RemoveToken(authToken)
	}

	_ = os.Remove(pl.lockFilePath)

	// Reset state to allow relaunch
	pl.mu.Lock()
	pl.pid = 0
	pl.processCmd = nil
	pl.authToken = ""
	pl.status = dto.PluginStatusNotInstalled
	pl.lastError = ""
	pl.mu.Unlock()

	return nil
}
