package app

import (
	"context"
	"testing"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/remotecommand"
)

// ---------------------------------------------------------------------------
// logKey / execKey
// ---------------------------------------------------------------------------

func TestLogKey(t *testing.T) {
	got := logKey("default", "my-pod", "app")
	want := "log:default:my-pod:app"
	if got != want {
		t.Errorf("logKey = %q; want %q", got, want)
	}
}

func TestExecKey(t *testing.T) {
	got := execKey("kube-system", "coredns-abc", "coredns")
	want := "exec:kube-system:coredns-abc:coredns"
	if got != want {
		t.Errorf("execKey = %q; want %q", got, want)
	}
}

// Keys must be stable across repeated calls with the same args.
func TestLogKey_Stable(t *testing.T) {
	a := logKey("ns", "pod", "c")
	b := logKey("ns", "pod", "c")
	if a != b {
		t.Errorf("logKey is not stable: %q vs %q", a, b)
	}
}

func TestExecKey_Stable(t *testing.T) {
	a := execKey("ns", "pod", "c")
	b := execKey("ns", "pod", "c")
	if a != b {
		t.Errorf("execKey is not stable: %q vs %q", a, b)
	}
}

// Different inputs must not collide.
func TestLogKey_NoCollision(t *testing.T) {
	k1 := logKey("ns", "pod", "container")
	k2 := logKey("ns:pod", "container", "")
	if k1 == k2 {
		t.Errorf("logKey collision: %q == %q", k1, k2)
	}
}

func TestExecKey_NoCollision(t *testing.T) {
	k1 := execKey("ns", "pod", "container")
	k2 := execKey("ns:pod", "container", "")
	if k1 == k2 {
		t.Errorf("execKey collision: %q == %q", k1, k2)
	}
}

// ---------------------------------------------------------------------------
// termSizeQueue
// ---------------------------------------------------------------------------

// Next returns a valid size when the channel has a value.
func TestTermSizeQueue_ReturnsSize(t *testing.T) {
	ch := make(chan remotecommand.TerminalSize, 1)
	ch <- remotecommand.TerminalSize{Width: 80, Height: 24}

	q := &termSizeQueue{ch: ch}
	sz := q.Next()
	if sz == nil {
		t.Fatal("expected non-nil TerminalSize")
	}
	if sz.Width != 80 || sz.Height != 24 {
		t.Errorf("got Width=%d Height=%d; want 80 24", sz.Width, sz.Height)
	}
}

// Next returns nil when the channel is closed, signalling stop.
func TestTermSizeQueue_ClosedChannelReturnsNil(t *testing.T) {
	ch := make(chan remotecommand.TerminalSize)
	close(ch)

	q := &termSizeQueue{ch: ch}
	sz := q.Next()
	if sz != nil {
		t.Errorf("expected nil on closed channel; got %+v", sz)
	}
}

// ---------------------------------------------------------------------------
// StopLogs — map management
// ---------------------------------------------------------------------------

// StopLogs cancels and removes the cancel from logCancels.
func TestStopLogs_CancelsAndRemovesKey(t *testing.T) {
	a := minimalApp()

	cancelled := false
	a.logCancels[logKey("default", "pod", "app")] = func() { cancelled = true }

	a.StopLogs("default", "pod", "app")

	if !cancelled {
		t.Error("StopLogs did not call the cancel func")
	}
	if _, ok := a.logCancels[logKey("default", "pod", "app")]; ok {
		t.Error("StopLogs did not remove key from logCancels")
	}
}

// StopLogs on a missing key must not panic.
func TestStopLogs_MissingKeyNoPanic(t *testing.T) {
	a := minimalApp()
	a.StopLogs("ns", "pod", "c") // must not panic
}

// StopLogs only removes the targeted key, leaving others intact.
func TestStopLogs_LeavesOtherKeysIntact(t *testing.T) {
	a := minimalApp()

	other := logKey("default", "other-pod", "c")
	a.logCancels[other] = func() {}
	a.logCancels[logKey("default", "pod", "app")] = func() {}

	a.StopLogs("default", "pod", "app")

	if _, ok := a.logCancels[other]; !ok {
		t.Error("StopLogs removed an unrelated key from logCancels")
	}
}

// ---------------------------------------------------------------------------
// StopExec — map management
// ---------------------------------------------------------------------------

// StopExec cancels and removes the cancel from execCancels.
func TestStopExec_CancelsAndRemovesKey(t *testing.T) {
	a := minimalApp()

	cancelled := false
	key := execKey("default", "pod", "app")
	a.execCancels[key] = func() { cancelled = true }

	a.StopExec("default", "pod", "app")

	if !cancelled {
		t.Error("StopExec did not call the cancel func")
	}
	if _, ok := a.execCancels[key]; ok {
		t.Error("StopExec did not remove key from execCancels")
	}
}

// StopExec on a missing key must not panic.
func TestStopExec_MissingKeyNoPanic(t *testing.T) {
	a := minimalApp()
	a.StopExec("ns", "pod", "c") // must not panic
}

// StopExec only removes the targeted key from execCancels.
func TestStopExec_LeavesOtherKeysIntact(t *testing.T) {
	a := minimalApp()

	other := execKey("default", "other-pod", "c")
	a.execCancels[other] = func() {}
	a.execCancels[execKey("default", "pod", "app")] = func() {}

	a.StopExec("default", "pod", "app")

	if _, ok := a.execCancels[other]; !ok {
		t.Error("StopExec removed an unrelated key from execCancels")
	}
}

// ---------------------------------------------------------------------------
// ResizeExecTerminal — non-blocking send
// ---------------------------------------------------------------------------

// ResizeExecTerminal returns an error when no session exists.
func TestResizeExecTerminal_NoSession(t *testing.T) {
	a := minimalApp()
	err := a.ResizeExecTerminal("ns", "pod", "c", 24, 80)
	if err == nil {
		t.Error("expected error for missing exec session")
	}
}

// ResizeExecTerminal succeeds and delivers the correct size to the channel.
func TestResizeExecTerminal_SendsSize(t *testing.T) {
	a := minimalApp()
	ch := make(chan remotecommand.TerminalSize, 1)
	key := execKey("ns", "pod", "c")
	a.execResizeChans[key] = ch

	if err := a.ResizeExecTerminal("ns", "pod", "c", 24, 80); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	select {
	case sz := <-ch:
		if sz.Height != 24 || sz.Width != 80 {
			t.Errorf("got Height=%d Width=%d; want 24 80", sz.Height, sz.Width)
		}
	default:
		t.Error("no size was sent to the channel")
	}
}

// ResizeExecTerminal must not block when the channel is already full (non-blocking select).
func TestResizeExecTerminal_DropWhenFull(t *testing.T) {
	a := minimalApp()
	ch := make(chan remotecommand.TerminalSize, 1)
	ch <- remotecommand.TerminalSize{Width: 80, Height: 24} // fill it

	key := execKey("ns", "pod", "c")
	a.execResizeChans[key] = ch

	done := make(chan struct{})
	go func() {
		_ = a.ResizeExecTerminal("ns", "pod", "c", 30, 100)
		close(done)
	}()

	// Must complete without blocking.
	<-done
}

// ResizeExecTerminal rows/cols are mapped to Height/Width correctly.
func TestResizeExecTerminal_RowsColsMapping(t *testing.T) {
	a := minimalApp()
	ch := make(chan remotecommand.TerminalSize, 1)
	key := execKey("ns", "pod", "c")
	a.execResizeChans[key] = ch

	if err := a.ResizeExecTerminal("ns", "pod", "c", 40, 120); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	sz := <-ch
	// rows → Height, cols → Width
	if sz.Height != 40 {
		t.Errorf("Height = %d; want 40 (rows)", sz.Height)
	}
	if sz.Width != 120 {
		t.Errorf("Width = %d; want 120 (cols)", sz.Width)
	}
}

// ---------------------------------------------------------------------------
// StreamLogs — no client returns error
// ---------------------------------------------------------------------------

// StreamLogs returns an error when no client is registered for the context.
func TestStreamLogs_NoClient(t *testing.T) {
	a := minimalApp()
	a.ctx = context.Background()

	err := a.StreamLogs("missing-context", "default", "pod", "app", false, false)
	if err == nil {
		t.Fatal("expected error for missing context client")
	}
}

// ---------------------------------------------------------------------------
// ExecInPod — no client returns error
// ---------------------------------------------------------------------------

// ExecInPod returns an error when no client is registered for the context.
func TestExecInPod_NoClient(t *testing.T) {
	a := minimalApp()
	a.ctx = context.Background()

	err := a.ExecInPod("missing-context", "default", "pod", "app")
	if err == nil {
		t.Fatal("expected error for missing context client")
	}
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// minimalApp creates an App with required maps initialised for unit tests.
func minimalApp() *App {
	return &App{
		clients:         make(map[string]*kubernetes.Clientset),
		logCancels:      make(map[string]context.CancelFunc),
		logSeqs:         make(map[string]uint64),
		execCancels:     make(map[string]context.CancelFunc),
		execResizeChans: make(map[string]chan remotecommand.TerminalSize),
	}
}
