package app

import (
	"sync"
	"testing"

	"github.com/galacius/galacius/internal/config"
)

// TestTryClaimConnectSeq_RejectsStaleAndDuplicate verifies the ordering guard
// used by Connect: a call with a seq no higher than the highest already
// claimed is rejected, and a strictly higher seq is accepted and becomes the
// new high-water mark.
func TestTryClaimConnectSeq_RejectsStaleAndDuplicate(t *testing.T) {
	a := &App{}

	if !a.tryClaimConnectSeq(1) {
		t.Fatal("expected first claim (seq=1) to succeed")
	}
	if !a.tryClaimConnectSeq(3) {
		t.Fatal("expected higher seq (seq=3) to succeed")
	}
	if a.tryClaimConnectSeq(2) {
		t.Fatal("expected stale seq (seq=2, after seq=3 already claimed) to be rejected")
	}
	if a.tryClaimConnectSeq(3) {
		t.Fatal("expected duplicate seq (seq=3) to be rejected")
	}
	if !a.tryClaimConnectSeq(4) {
		t.Fatal("expected higher seq (seq=4) to succeed")
	}
}

// TestTryClaimConnectSeq_ConcurrentOutOfOrderCompletion reproduces the actual
// bug: rapid back-and-forth cluster switches fire concurrent Connect calls
// whose slow network/informer-sync work can finish in an order that doesn't
// match the order the user clicked them in. Without this guard, whichever
// goroutine reaches the state-mutating section of Connect last would win,
// even if it was an earlier (now-stale) click. This asserts that regardless
// of completion order, only the call carrying the numerically highest seq
// is ever left as the claimed one.
func TestTryClaimConnectSeq_ConcurrentOutOfOrderCompletion(t *testing.T) {
	a := &App{}
	const n = 50

	var wg sync.WaitGroup
	claimed := make([]bool, n+1) // index 0 unused; seq values are 1..n
	for seq := int64(1); seq <= n; seq++ {
		wg.Add(1)
		go func(seq int64) {
			defer wg.Done()
			claimed[seq] = a.tryClaimConnectSeq(seq)
		}(seq)
	}
	wg.Wait()

	a.mu.RLock()
	finalSeq := a.activeContextSeq
	a.mu.RUnlock()
	if finalSeq != n {
		t.Fatalf("expected activeContextSeq to end at the highest seq (%d), got %d", n, finalSeq)
	}

	// A later call attempted after every goroutine above has finished must
	// still correctly recognize anything <= n as stale.
	if a.tryClaimConnectSeq(n) {
		t.Fatalf("expected seq=%d to be rejected as stale once %d is already claimed", n, n)
	}
	if !a.tryClaimConnectSeq(n + 1) {
		t.Fatalf("expected seq=%d (strictly newer) to be accepted", n+1)
	}
}

// TestRestoredNamespacesForContextLocked_ReturnsPersistedDefaults is a
// regression test for the bug where Connect only pushed a context's
// persisted default namespace filter to plugins on a genuine context switch,
// leaving a plugin's synced filter stale on a plain reconnect to the
// already-active context (e.g. a page reload while the host process keeps
// running). Connect now always seeds a.activeNamespaces via this helper.
func TestRestoredNamespacesForContextLocked_ReturnsPersistedDefaults(t *testing.T) {
	a := &App{
		settings: config.Settings{
			ClusterDefaultNamespaces: map[string][]string{
				"minikube": {"super-longgggg", "test", "test-galacius"},
			},
		},
	}

	got := a.restoredNamespacesForContextLocked("minikube")
	want := []string{"super-longgggg", "test", "test-galacius"}
	if len(got) != len(want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected %v, got %v", want, got)
		}
	}
}

// TestRestoredNamespacesForContextLocked_UnknownContextReturnsNil verifies a
// context with no saved default filter restores to nil (interpreted
// downstream as "all namespaces"), not a stale value from another context.
func TestRestoredNamespacesForContextLocked_UnknownContextReturnsNil(t *testing.T) {
	a := &App{
		settings: config.Settings{
			ClusterDefaultNamespaces: map[string][]string{
				"minikube": {"default"},
			},
		},
	}

	got := a.restoredNamespacesForContextLocked("docker-desktop")
	if got != nil {
		t.Fatalf("expected nil for a context with no saved defaults, got %v", got)
	}
}

// TestRestoredNamespacesForContextLocked_ReturnsIndependentCopy verifies the
// returned slice doesn't alias the settings-backed slice: mutating the
// result (as Connect's a.activeNamespaces is expected to be, over its
// lifetime) must never corrupt the persisted settings value.
func TestRestoredNamespacesForContextLocked_ReturnsIndependentCopy(t *testing.T) {
	original := []string{"default"}
	a := &App{
		settings: config.Settings{
			ClusterDefaultNamespaces: map[string][]string{
				"minikube": original,
			},
		},
	}

	got := a.restoredNamespacesForContextLocked("minikube")
	got[0] = "mutated"

	if original[0] != "default" {
		t.Fatalf("expected persisted settings slice to be unaffected, got %v", original)
	}
}
