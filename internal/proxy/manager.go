package proxy

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type State int

const (
	Idle State = iota
	Starting
	Ready
	Degraded
	Stopping
)

func (s State) String() string {
	switch s {
	case Idle:
		return "idle"
	case Starting:
		return "starting"
	case Ready:
		return "ready"
	case Degraded:
		return "degraded"
	case Stopping:
		return "stopping"
	default:
		return "unknown"
	}
}

// Status is a snapshot of a Manager's current state, for callers (e.g. the
// frontend footer) that want to display it without subscribing to events.
type Status struct {
	State   string
	Message string
}

type Manager struct {
	contextName string
	command     string
	proxyAddr   string // host:port to poll as a readiness fallback; see doLaunch
	emitEvent   func(eventName, message string)

	mu          sync.Mutex
	state       State
	message     string
	launchSeq   int64
	cmd         *exec.Cmd
	cancelFunc  context.CancelFunc
	settledChan chan struct{}
	procDone    chan struct{} // closed once the current/most recent launch's process has actually exited; nil until a process is first started
	procErr     error         // cmd.Wait() result for procDone; valid only after procDone is closed

	setupTimeout        time.Duration
	healthCheckInterval time.Duration
}

// NewManager creates a Manager for a setup command. proxyAddr, if non-empty,
// is the host:port of the proxy the command is expected to stand up (i.e.
// this cluster's configured httpProxy/httpsProxy address) — it's polled as a
// readiness fallback alongside the GALACIUS_SETUP_READY stdout marker, since
// not every setup command can be made to print a marker (e.g. a script whose
// last step execs a long-running foreground tunnel like `aws ssm
// start-session`, which never returns to reach a later echo). Pass "" to
// rely on the stdout marker alone.
func NewManager(contextName, command, proxyAddr string, emitEvent func(eventName, message string)) *Manager {
	closed := make(chan struct{})
	close(closed)
	return &Manager{
		contextName:         contextName,
		command:             command,
		proxyAddr:           proxyAddr,
		emitEvent:           emitEvent,
		state:               Idle,
		settledChan:         closed,
		setupTimeout:        5 * time.Minute,
		healthCheckInterval: 10 * time.Second,
	}
}

func (m *Manager) SetupTimeout(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.setupTimeout = d
}

// SetHealthCheckInterval overrides the default 10s cadence at which a Ready
// manager re-verifies its proxy port is still reachable. Exposed mainly for
// tests that want a health check to fire within a short sleep window.
func (m *Manager) SetHealthCheckInterval(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.healthCheckInterval = d
}

func (m *Manager) Command() string {
	return m.command
}

func (m *Manager) ProxyAddr() string {
	return m.proxyAddr
}

// Status returns a snapshot of the manager's current state and last status
// message, for callers that want to display it without subscribing to events.
func (m *Manager) Status() Status {
	m.mu.Lock()
	defer m.mu.Unlock()
	return Status{State: m.state.String(), Message: m.message}
}

// Wait returns a channel that closes once the in-flight (or most recently
// completed) launch has settled into Idle, Ready, or Degraded. If Connect
// hasn't been called since the manager was created, or since it last
// returned to Idle, the channel is already closed. Callers that want
// Connect() to pause until the setup command signals readiness (e.g. an SSO
// browser flow the command opens) should call Connect() followed by
// <-mgr.Wait().
func (m *Manager) Wait() <-chan struct{} {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.settledChan
}

func (m *Manager) Connect() error {
	m.mu.Lock()
	// Idle: first attempt for this context. Degraded: the previous attempt
	// gave up (timeout/crash/failed start) and a fresh Connect should retry
	// rather than silently no-op and leave GetProxyStatus reporting the old
	// failure forever. Starting/Ready/Stopping are left alone: Starting and
	// Stopping already have a launch in flight, and Ready means the proxy is
	// still working, so restarting it would be wasteful.
	if m.state != Idle && m.state != Degraded {
		m.mu.Unlock()
		return nil
	}
	m.state = Starting
	m.message = ""
	m.launchSeq++
	seq := m.launchSeq
	ctx, cancel := context.WithCancel(context.Background())
	m.cancelFunc = cancel
	settled := make(chan struct{})
	m.settledChan = settled
	m.mu.Unlock()

	m.emitEvent("SetupCommandStarting", "")
	go m.doLaunch(ctx, seq, settled)
	return nil
}

func (m *Manager) doLaunch(ctx context.Context, seq int64, settled chan struct{}) {
	defer close(settled)

	m.mu.Lock()
	if m.launchSeq != seq {
		m.mu.Unlock()
		return
	}
	m.mu.Unlock()

	readyMarkerChan := make(chan struct{})

	cmd := exec.CommandContext(ctx, "sh", "-c", m.command)
	setProcessGroup(cmd)
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		msg := fmt.Sprintf("failed to start setup command: %v", err)
		m.transitionTo(Degraded, seq, msg)
		m.emitEvent("SetupCommandDegraded", msg)
		return
	}

	// Single Wait() call, shared between the early-exit detection below,
	// watchProcessDeath (spawned later, after Ready), and Stop() — exec.Cmd.Wait
	// may only be called once. procDone is stored on the Manager (not just a
	// local var) so Stop() can block until the process is actually reaped
	// before returning: two contexts can be configured with setup commands
	// that bind the same local proxy port, and Stop() previously only sent the
	// kill signal and returned immediately, so a fresh Connect() to the other
	// context could start racing to bind that port before this process had
	// actually released it.
	procDone := make(chan struct{})
	m.mu.Lock()
	m.cmd = cmd
	m.procDone = procDone
	m.mu.Unlock()

	go scanExactLine(stdout, "GALACIUS_SETUP_READY", readyMarkerChan, m.contextName)
	go logLines(stderr, m.contextName)

	go func() {
		err := cmd.Wait()
		m.mu.Lock()
		m.procErr = err
		m.mu.Unlock()
		close(procDone)
	}()

	portReadyChan := make(chan struct{})
	var pollStop chan struct{}
	if m.proxyAddr != "" {
		pollStop = make(chan struct{})
		go pollTCPReady(m.proxyAddr, portReadyChan, pollStop)
	}

	m.mu.Lock()
	timeoutDuration := m.setupTimeout
	m.mu.Unlock()
	timeoutChan := time.After(timeoutDuration)

	// Loop rather than a single select: a clean (nil-error) procDone can race
	// readyMarkerChan/portReadyChan becoming ready at the same instant (e.g. a
	// script that prints the marker and then exits immediately) — Go's select
	// picks among simultaneously-ready cases at random, so treating every
	// procDone as fatal would sometimes misreport that benign race as a
	// failure. Only a genuine error exit (err != nil, e.g. "command not
	// found") is fatal; a clean exit before a ready signal just disables the
	// procDone case (nil channel blocks forever) and the loop re-selects
	// among the remaining cases.
	for {
		select {
		case <-ctx.Done():
			killProcessGroup(cmd)
			log.Printf("[setup-command:%s] proxy server terminated: connect cancelled", m.contextName)
			m.transitionTo(Idle, seq, "")
			m.emitEvent("SetupCommandIdle", "")
		case <-readyMarkerChan:
			msg := "proxy setup command ready"
			if m.transitionIfStillStarting(Ready, seq, msg) {
				m.emitEvent("SetupCommandReady", msg)
				go m.watchProcessDeath(procDone, seq)
				if m.proxyAddr != "" {
					go m.watchProxyHealth(seq)
				}
			}
		case <-portReadyChan:
			msg := "proxy setup command ready (proxy port reachable)"
			if m.transitionIfStillStarting(Ready, seq, msg) {
				m.emitEvent("SetupCommandReady", msg)
				go m.watchProcessDeath(procDone, seq)
				if m.proxyAddr != "" {
					go m.watchProxyHealth(seq)
				}
			}
		case <-procDone:
			m.mu.Lock()
			err := m.procErr
			m.mu.Unlock()
			if err != nil {
				// The setup command exited with an error before ever
				// signalling ready (e.g. "command not found") — fail fast
				// instead of sitting through the rest of the timeout with no
				// feedback.
				msg := fmt.Sprintf("setup command exited before becoming ready: %v", err)
				log.Printf("[setup-command:%s] proxy server terminated: exited before ready (%v)", m.contextName, err)
				m.transitionTo(Degraded, seq, msg)
				m.emitEvent("SetupCommandDegraded", msg)
			} else {
				procDone = nil
				continue
			}
		case <-timeoutChan:
			killProcessGroup(cmd)
			log.Printf("[setup-command:%s] proxy server terminated: setup command timed out after 5m", m.contextName)
			msg := "setup command timed out after 5m; proceeding without working proxy"
			m.transitionTo(Degraded, seq, msg)
			m.emitEvent("SetupCommandDegraded", msg)
		}
		break
	}

	if pollStop != nil {
		close(pollStop)
	}
}

// pollTCPReady repeatedly dials addr until it accepts a connection, then
// closes notifyChan. Stops early, without closing notifyChan, if stop is
// closed first.
func pollTCPReady(addr string, notifyChan chan struct{}, stop chan struct{}) {
	for {
		conn, err := net.DialTimeout("tcp", addr, 300*time.Millisecond)
		if err == nil {
			conn.Close()
			close(notifyChan)
			return
		}
		select {
		case <-stop:
			return
		case <-time.After(300 * time.Millisecond):
		}
	}
}

// watchProcessDeath waits for the setup command process to exit after it has
// already reached Ready. procDone is the Manager's shared cmd.Wait()
// completion signal, started in doLaunch — exec.Cmd.Wait may only be called
// once, and doLaunch's own select and Stop() also read this same signal, so
// no other code may call cmd.Wait() independently.
func (m *Manager) watchProcessDeath(procDone <-chan struct{}, seq int64) {
	<-procDone
	msg := "setup command process exited unexpectedly after reaching ready state"
	if m.transitionIfStillInState(Ready, Degraded, seq, msg) {
		log.Printf("[setup-command:%s] proxy server terminated: process exited unexpectedly", m.contextName)
		m.emitEvent("SetupCommandCrashed", msg)
	}
}

// watchProxyHealth periodically re-dials proxyAddr while the manager stays
// Ready. A Ready process can go on running while the tunnel/proxy it manages
// silently breaks internally (e.g. an SSM session dying without killing the
// wrapping process) — watchProcessDeath alone can't catch that, since it only
// notices the process actually exiting. Stops itself as soon as the launch it
// was spawned for is no longer the current Ready one, or after demoting once.
func (m *Manager) watchProxyHealth(seq int64) {
	m.mu.Lock()
	interval := m.healthCheckInterval
	m.mu.Unlock()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		m.mu.Lock()
		if m.launchSeq != seq || m.state != Ready {
			m.mu.Unlock()
			return
		}
		addr := m.proxyAddr
		cmd := m.cmd
		m.mu.Unlock()

		conn, err := net.DialTimeout("tcp", addr, 2*time.Second)
		if err == nil {
			conn.Close()
			continue
		}

		msg := fmt.Sprintf("proxy port %s became unreachable", addr)
		if m.transitionIfStillInState(Ready, Degraded, seq, msg) {
			killProcessGroup(cmd)
			log.Printf("[setup-command:%s] proxy server terminated: health check failed", m.contextName)
			m.emitEvent("SetupCommandDegraded", msg)
		}
		return
	}
}

// Stop tears down the manager's current launch, if any, and blocks until the
// underlying setup-command process has actually been reaped (not just sent a
// kill signal) before returning. That's required, not just tidy: two cluster
// contexts can each run a setup command bound to the same local proxy port,
// and a caller that switches contexts immediately calls Stop() on the
// outgoing one followed by Connect() on the incoming one — if Stop() returned
// before the old process actually released the port, the new setup command
// could race it and either fail to bind or (worse) the port could appear
// reachable from the old process's lingering listener, making the readiness
// poll in doLaunch report Ready before the new context's own setup actually
// finished.
func (m *Manager) Stop() {
	m.mu.Lock()
	switch m.state {
	case Idle:
		m.mu.Unlock()
		return
	case Starting:
		cancel := m.cancelFunc
		procDone := m.procDone
		m.state = Stopping
		m.mu.Unlock()
		cancel() // doLaunch's ctx.Done() branch kills the process and transitions to Idle
		if procDone != nil {
			<-procDone
		}
	case Ready, Degraded:
		cmd := m.cmd
		procDone := m.procDone
		m.state = Idle
		m.message = ""
		m.mu.Unlock()
		killProcessGroup(cmd)
		if procDone != nil {
			<-procDone
		}
		log.Printf("[setup-command:%s] proxy server terminated: disconnected", m.contextName)
		m.emitEvent("SetupCommandIdle", "")
	case Stopping:
		m.mu.Unlock()
	}
}

func (m *Manager) transitionTo(newState State, seq int64, message string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.launchSeq != seq {
		return false
	}
	m.state = newState
	m.message = message
	return true
}

func (m *Manager) transitionIfStillStarting(newState State, seq int64, message string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.launchSeq != seq || m.state != Starting {
		return false
	}
	m.state = newState
	m.message = message
	return true
}

func (m *Manager) transitionIfStillInState(from, to State, seq int64, message string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.launchSeq != seq || m.state != from {
		return false
	}
	m.state = to
	m.message = message
	return true
}

func scanExactLine(source io.Reader, target string, notifyChan chan struct{}, contextName string) {
	scanner := bufio.NewScanner(source)
	for scanner.Scan() {
		line := scanner.Text()
		log.Printf("[setup-command:%s] %s", contextName, line)
		if strings.TrimSpace(line) == target {
			close(notifyChan)
			return
		}
	}
	if err := scanner.Err(); err != nil {
		log.Printf("error reading setup command stdout for %s: %v", contextName, err)
	}
}

func logLines(source io.Reader, contextName string) {
	scanner := bufio.NewScanner(source)
	for scanner.Scan() {
		log.Printf("[setup-command:%s] %s", contextName, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		log.Printf("error reading setup command stderr for %s: %v", contextName, err)
	}
}
