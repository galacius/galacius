package proxy

import (
	"encoding/json"
	"io"
	"net"
	"os"
	"slices"
	"sync"
	"testing"
	"time"
)

func TestManagerHappyPath(t *testing.T) {
	var mu sync.Mutex
	events := []string{}
	m := NewManager("test-ctx", "sh -c 'echo GALACIUS_SETUP_READY'", "", func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})
	m.SetupTimeout(100 * time.Millisecond)

	err := m.Connect()
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	time.Sleep(200 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()
	if len(events) < 2 {
		t.Fatalf("expected at least SetupCommandStarting and SetupCommandReady events, got %v", events)
	}
	if events[0] != "SetupCommandStarting" {
		t.Errorf("expected first event to be SetupCommandStarting, got %s", events[0])
	}
	if events[1] != "SetupCommandReady" {
		t.Errorf("expected second event to be SetupCommandReady, got %s", events[1])
	}
}

func TestManagerTimeout(t *testing.T) {
	var mu sync.Mutex
	events := []string{}
	m := NewManager("test-ctx", "sh -c 'sleep 10'", "", func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})
	m.SetupTimeout(100 * time.Millisecond)

	err := m.Connect()
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	time.Sleep(300 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()
	found := false
	for _, e := range events {
		if e == "SetupCommandDegraded" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected SetupCommandDegraded event, got %v", events)
	}
}

func TestManagerStopDuringStarting(t *testing.T) {
	var mu sync.Mutex
	events := []string{}
	m := NewManager("test-ctx", "sh -c 'sleep 10'", "", func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})
	m.SetupTimeout(5 * time.Second)

	err := m.Connect()
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	time.Sleep(10 * time.Millisecond)
	m.Stop()

	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()
	found := false
	for _, e := range events {
		if e == "SetupCommandDegraded" || e == "SetupCommandReady" || e == "SetupCommandCrashed" {
			found = true
			break
		}
	}
	if found {
		t.Errorf("should not emit events after Stop during Starting, got %v", events)
	}
}

func TestManagerStopDuringReady(t *testing.T) {
	var mu sync.Mutex
	events := []string{}
	m := NewManager("test-ctx", "sh -c 'echo GALACIUS_SETUP_READY; sleep 10'", "", func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})
	m.SetupTimeout(5 * time.Second)

	err := m.Connect()
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	time.Sleep(200 * time.Millisecond)
	m.Stop()

	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()
	readyFound := false
	for _, e := range events {
		if e == "SetupCommandReady" {
			readyFound = true
			break
		}
	}
	if !readyFound {
		t.Errorf("expected SetupCommandReady before Stop, got %v", events)
	}
}

// TestManagerStopWaitsForProcessExit guards against a race that mattered
// when two cluster contexts share the same local proxy port (e.g. each
// context's setup command binds its own tunnel to the same address):
// switching contexts calls Stop() on the outgoing manager immediately
// followed by Connect() on the incoming one, so Stop() must not return until
// the outgoing process has actually been reaped — otherwise the incoming
// setup command's port-readiness poll could observe the old, still-dying
// process's listener and report Ready before the new context's own setup
// actually finished.
func TestManagerStopWaitsForProcessExit(t *testing.T) {
	m := NewManager("test-ctx", "sh -c 'echo GALACIUS_SETUP_READY; sleep 10'", "", func(string, string) {})
	m.SetupTimeout(5 * time.Second)

	if err := m.Connect(); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	select {
	case <-m.Wait():
	case <-time.After(2 * time.Second):
		t.Fatal("Wait() did not unblock in time")
	}

	m.Stop()

	m.mu.Lock()
	procDone := m.procDone
	m.mu.Unlock()
	select {
	case <-procDone:
	default:
		t.Fatal("Stop() returned before the setup command process was reaped")
	}
}

func TestManagerReconnectReusesReady(t *testing.T) {
	var mu sync.Mutex
	events := []string{}
	m := NewManager("test-ctx", "sh -c 'echo GALACIUS_SETUP_READY; sleep 10'", "", func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})
	m.SetupTimeout(5 * time.Second)

	err := m.Connect()
	if err != nil {
		t.Fatalf("first Connect failed: %v", err)
	}

	time.Sleep(200 * time.Millisecond)

	mu.Lock()
	readyCount := 0
	for _, e := range events {
		if e == "SetupCommandReady" {
			readyCount++
		}
	}
	mu.Unlock()

	err = m.Connect()
	if err != nil {
		t.Fatalf("second Connect failed: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	readyCountAfter := 0
	for _, e := range events {
		if e == "SetupCommandReady" {
			readyCountAfter++
		}
	}
	mu.Unlock()

	if readyCount != 1 || readyCountAfter != 1 {
		t.Errorf("expected exactly one SetupCommandReady event even after second Connect, got %d then %d", readyCount, readyCountAfter)
	}
}

func TestScanExactLine(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		target   string
		expected bool
	}{
		{
			name:     "exact match",
			input:    "GALACIUS_SETUP_READY\n",
			target:   "GALACIUS_SETUP_READY",
			expected: true,
		},
		{
			name:     "with whitespace",
			input:    "  GALACIUS_SETUP_READY  \n",
			target:   "GALACIUS_SETUP_READY",
			expected: true,
		},
		{
			name:     "no match",
			input:    "other line\n",
			target:   "GALACIUS_SETUP_READY",
			expected: false,
		},
		{
			name:     "partial match",
			input:    "GALACIUS_SETUP_READY_NOT\n",
			target:   "GALACIUS_SETUP_READY",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, w, err := os.Pipe()
			if err != nil {
				t.Fatalf("failed to create pipe: %v", err)
			}
			defer r.Close()

			notifyChan := make(chan struct{})

			go scanExactLine(r, tt.target, notifyChan, "test-context")

			_, err = io.WriteString(w, tt.input)
			if err != nil {
				t.Fatalf("failed to write: %v", err)
			}
			w.Close()

			if tt.expected {
				select {
				case <-notifyChan:
				case <-time.After(1 * time.Second):
					t.Fatal("expected notification but timed out")
				}
			} else {
				select {
				case <-notifyChan:
					t.Fatal("got unexpected notification")
				case <-time.After(100 * time.Millisecond):
				}
			}
		})
	}
}

// TestManagerFailsFastOnCommandNotFound covers the gap doLaunch's select used
// to have: before the early-exit detection, a setup command that failed
// immediately (e.g. a script missing from PATH, the class of bug caused by a
// GUI-launched app's stripped PATH — see resolveLoginShellPATH) went
// undetected until the full setup timeout elapsed, which read as "stuck
// forever" to the user. It should now demote to Degraded immediately.
func TestManagerFailsFastOnCommandNotFound(t *testing.T) {
	var mu sync.Mutex
	events := []string{}
	m := NewManager("test-ctx", "this-command-does-not-exist-anywhere", "", func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})
	m.SetupTimeout(5 * time.Second)

	start := time.Now()
	if err := m.Connect(); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	select {
	case <-m.Wait():
	case <-time.After(2 * time.Second):
		t.Fatal("Wait() did not unblock in time — early-exit detection did not fire")
	}
	if elapsed := time.Since(start); elapsed >= m.setupTimeout {
		t.Fatalf("expected fast failure well under the %v setup timeout, took %v", m.setupTimeout, elapsed)
	}

	mu.Lock()
	defer mu.Unlock()
	if !slices.Contains(events, "SetupCommandDegraded") {
		t.Errorf("expected SetupCommandDegraded event, got %v", events)
	}
}

// TestManagerReadyThenImmediateCleanExitIsNotFailure covers the race the
// early-exit detection introduced: cmd.Wait() completing with a nil error can
// become ready at the same instant as readyMarkerChan (a script that prints
// the marker and exits immediately, a legitimate pattern for setup scripts
// that don't need to stay running). That must still report Ready, not
// Degraded.
func TestManagerReadyThenImmediateCleanExitIsNotFailure(t *testing.T) {
	for i := range 20 {
		var mu sync.Mutex
		events := []string{}
		m := NewManager("test-ctx", "sh -c 'echo GALACIUS_SETUP_READY'", "", func(name, msg string) {
			mu.Lock()
			events = append(events, name)
			mu.Unlock()
		})
		m.SetupTimeout(2 * time.Second)

		if err := m.Connect(); err != nil {
			t.Fatalf("Connect failed: %v", err)
		}

		select {
		case <-m.Wait():
		case <-time.After(2 * time.Second):
			t.Fatal("Wait() did not unblock in time")
		}

		mu.Lock()
		got := append([]string{}, events...)
		mu.Unlock()
		if !slices.Contains(got, "SetupCommandReady") {
			t.Fatalf("run %d: expected SetupCommandReady, got %v", i, got)
		}
		if slices.Contains(got, "SetupCommandDegraded") {
			t.Fatalf("run %d: a clean exit racing the ready marker must not report Degraded, got %v", i, got)
		}
	}
}

func TestManagerStopDuringIdle(t *testing.T) {
	var mu sync.Mutex
	events := []string{}
	m := NewManager("test-ctx", "sh -c 'echo GALACIUS_SETUP_READY'", "", func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})

	m.Stop()

	mu.Lock()
	defer mu.Unlock()
	if len(events) > 0 {
		t.Errorf("expected no events when stopping during Idle, got %v", events)
	}
}

func TestManagerCrashAfterReady(t *testing.T) {
	var mu sync.Mutex
	events := []string{}
	m := NewManager("test-ctx", "sh -c 'echo GALACIUS_SETUP_READY; sleep 1; exit 1'", "", func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})
	m.SetupTimeout(5 * time.Second)

	err := m.Connect()
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	time.Sleep(500 * time.Millisecond)

	mu.Lock()
	readyFound := false
	for _, e := range events {
		if e == "SetupCommandReady" {
			readyFound = true
			break
		}
	}
	mu.Unlock()

	if !readyFound {
		t.Fatal("expected SetupCommandReady event before process crash")
	}

	time.Sleep(1500 * time.Millisecond)

	mu.Lock()
	crashFound := false
	for _, e := range events {
		if e == "SetupCommandCrashed" {
			crashFound = true
			break
		}
	}
	mu.Unlock()

	if !crashFound {
		t.Errorf("expected SetupCommandCrashed event after process death, got %v", events)
	}
}

// TestManagerHealthCheckDetectsDeadPort covers the gap watchProcessDeath
// can't: a setup command process that stays alive while the tunnel/proxy it
// manages silently stops accepting connections. The periodic health check
// must demote Ready -> Degraded once the port stops responding, and kill the
// now-useless process so a subsequent Connect() can actually restart it.
func TestManagerHealthCheckDetectsDeadPort(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to open listener: %v", err)
	}
	addr := ln.Addr().String()
	ln.Close()

	var mu sync.Mutex
	events := []string{}
	m := NewManager("test-ctx", "sh -c 'echo GALACIUS_SETUP_READY; sleep 10'", addr, func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})
	m.SetupTimeout(5 * time.Second)
	m.SetHealthCheckInterval(100 * time.Millisecond)

	if err := m.Connect(); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	// Give the preflight time to observe the port as closed before the
	// tunnel (represented by this listener) comes up.
	time.Sleep(50 * time.Millisecond)
	ln2, err := net.Listen("tcp", addr)
	if err != nil {
		t.Fatalf("failed to reopen listener at %s: %v", addr, err)
	}

	select {
	case <-m.Wait():
	case <-time.After(2 * time.Second):
		t.Fatal("Wait() did not unblock in time")
	}

	// Let at least one health check tick observe the port as reachable
	// before killing it, so this exercises a live->dead transition rather
	// than the port simply never having come up.
	time.Sleep(250 * time.Millisecond)

	// Close the listener to simulate the tunnel dying while the wrapping
	// process (the sleep) stays alive.
	ln2.Close()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		mu.Lock()
		found := false
		for _, e := range events {
			if e == "SetupCommandDegraded" {
				found = true
				break
			}
		}
		mu.Unlock()
		if found {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}

	mu.Lock()
	defer mu.Unlock()
	t.Fatalf("expected SetupCommandDegraded event once the proxy port died, got %v", events)
}

func TestManagerConcurrentConnect(t *testing.T) {
	var mu sync.Mutex
	events := []string{}
	m := NewManager("test-ctx", "sh -c 'echo GALACIUS_SETUP_READY; sleep 10'", "", func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})
	m.SetupTimeout(5 * time.Second)

	err1 := m.Connect()
	err2 := m.Connect()

	if err1 != nil {
		t.Fatalf("first Connect failed: %v", err1)
	}
	if err2 != nil {
		t.Fatalf("second Connect should succeed (no-op): %v", err2)
	}

	time.Sleep(300 * time.Millisecond)

	mu.Lock()
	readyCount := 0
	for _, e := range events {
		if e == "SetupCommandReady" {
			readyCount++
		}
	}
	mu.Unlock()

	if readyCount != 1 {
		t.Errorf("expected exactly one SetupCommandReady event with concurrent Connects, got %d", readyCount)
	}
}

func TestClusterProxyRoundTrip(t *testing.T) {
	type ClusterProxy struct {
		HttpProxy    string `json:"httpProxy"`
		HttpsProxy   string `json:"httpsProxy"`
		SetupCommand string `json:"setupCommand"`
	}

	original := ClusterProxy{
		HttpProxy:    "http://proxy.example.com:8080",
		HttpsProxy:   "https://proxy.example.com:8443",
		SetupCommand: "ssm-proxy start",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var unmarshaled ClusterProxy
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if unmarshaled.HttpProxy != original.HttpProxy {
		t.Errorf("httpProxy mismatch: %v vs %v", unmarshaled.HttpProxy, original.HttpProxy)
	}
	if unmarshaled.HttpsProxy != original.HttpsProxy {
		t.Errorf("httpsProxy mismatch: %v vs %v", unmarshaled.HttpsProxy, original.HttpsProxy)
	}
	if unmarshaled.SetupCommand != original.SetupCommand {
		t.Errorf("setupCommand mismatch: %v vs %v", unmarshaled.SetupCommand, original.SetupCommand)
	}
}

// TestManagerWaitBlocksUntilReady guards against the bug where a caller
// (App.Connect) started the setup command but never actually paused for it —
// it raced ahead to connect while e.g. an SSO browser flow the command opens
// was still in progress. Wait() must block until the launch settles.
func TestManagerWaitBlocksUntilReady(t *testing.T) {
	m := NewManager("test-ctx", "sleep 0.2 && echo GALACIUS_SETUP_READY", "", func(name, msg string) {})
	m.SetupTimeout(5 * time.Second)

	if err := m.Connect(); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	start := time.Now()
	select {
	case <-m.Wait():
	case <-time.After(2 * time.Second):
		t.Fatal("Wait() did not unblock in time")
	}
	elapsed := time.Since(start)

	if elapsed < 150*time.Millisecond {
		t.Errorf("Wait() returned too early (%v); it should have paused for the command to signal readiness", elapsed)
	}

	// A subsequent Wait() call on an already-settled manager must return
	// immediately, not re-block on a stale/new channel.
	select {
	case <-m.Wait():
	default:
		t.Error("expected Wait() to be immediately ready after the manager settled")
	}
}

// TestManagerWaitBlocksUntilTimeout ensures Wait() also pauses for the full
// fail-open timeout path, not just the happy path.
func TestManagerWaitBlocksUntilTimeout(t *testing.T) {
	m := NewManager("test-ctx", "sleep 5", "", func(name, msg string) {})
	m.SetupTimeout(150 * time.Millisecond)

	if err := m.Connect(); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	start := time.Now()
	select {
	case <-m.Wait():
	case <-time.After(2 * time.Second):
		t.Fatal("Wait() did not unblock in time")
	}
	elapsed := time.Since(start)

	if elapsed < 100*time.Millisecond {
		t.Errorf("Wait() returned too early (%v); it should have paused through the setup timeout", elapsed)
	}
}

// TestManagerWaitImmediateWhenNeverConnected ensures Wait() never blocks a
// caller when Connect() was never invoked (e.g. no setup command configured).
func TestManagerWaitImmediateWhenNeverConnected(t *testing.T) {
	m := NewManager("test-ctx", "", "", func(name, msg string) {})

	select {
	case <-m.Wait():
	default:
		t.Error("expected Wait() to be immediately ready when Connect() was never called")
	}
}

// TestManagerReadyViaProxyPortFallback covers a command that never prints
// GALACIUS_SETUP_READY because its last step execs a long-running foreground
// process (e.g. `aws ssm start-session`, which blocks forever keeping a
// tunnel alive and never returns to reach a later echo). The manager must
// still reach Ready once the configured proxy port itself becomes reachable.
func TestManagerReadyViaProxyPortFallback(t *testing.T) {
	// Reserve a free port, then release it immediately so nothing is
	// listening when Connect() runs its reachability preflight — otherwise
	// the preflight would find the port already reachable and skip running
	// the setup command entirely, short-circuiting the port-poll fallback
	// this test exercises.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to open listener: %v", err)
	}
	addr := ln.Addr().String()
	ln.Close()

	var mu sync.Mutex
	events := []string{}
	// This command never prints the marker and just sleeps, mirroring a
	// script whose final step is a blocking foreground tunnel.
	m := NewManager("test-ctx", "sh -c 'sleep 10'", addr, func(name, msg string) {
		mu.Lock()
		events = append(events, name)
		mu.Unlock()
	})
	m.SetupTimeout(5 * time.Second)

	if err := m.Connect(); err != nil {
		t.Fatalf("Connect failed: %v", err)
	}

	// Give the preflight time to observe the port as closed before the
	// tunnel (represented by this listener) comes up.
	time.Sleep(50 * time.Millisecond)
	ln2, err := net.Listen("tcp", addr)
	if err != nil {
		t.Fatalf("failed to reopen listener at %s: %v", addr, err)
	}
	defer ln2.Close()

	select {
	case <-m.Wait():
	case <-time.After(3 * time.Second):
		t.Fatal("Wait() did not unblock in time")
	}

	mu.Lock()
	defer mu.Unlock()
	if len(events) < 2 {
		t.Fatalf("expected at least SetupCommandStarting and SetupCommandReady events via proxy port fallback, got %v", events)
	}
	if events[0] != "SetupCommandStarting" {
		t.Errorf("expected first event to be SetupCommandStarting, got %s", events[0])
	}
	if events[1] != "SetupCommandReady" {
		t.Errorf("expected second event to be SetupCommandReady via proxy port fallback, got %s", events[1])
	}
}
