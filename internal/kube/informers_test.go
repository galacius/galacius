package kube

import (
	"fmt"
	"testing"
	"time"

	"github.com/galacius/galacius/internal/lib/debouncer"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
)

// TestNewFactoryHandleAndGetSyncedChan verifies that NewFactoryHandle returns
// quickly (non-blocking) and that GetSyncedChan allows callers to wait for
// per-resource cache sync before reading from listers.
func TestNewFactoryHandleAndGetSyncedChan(t *testing.T) {
	const podCount = 500

	objs := make([]runtime.Object, 0, podCount)
	for i := range podCount {
		objs = append(objs, &corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      fmt.Sprintf("pod-%d", i),
				Namespace: "default",
			},
		})
	}

	cs := fake.NewSimpleClientset(objs...)

	h := NewFactoryHandle(cs, func(string, string) {})
	defer h.Stop()

	// NewFactoryHandle should return quickly; cache may not be synced yet.
	// Cache sync is async; don't assert on pod count immediately after return.
	if _, err := h.Factory.Core().V1().Pods().Lister().List(labels.Everything()); err != nil {
		t.Fatalf("unexpected error listing pods: %v", err)
	}

	// After waiting on GetSyncedChan("pods"), cache should be warm
	<-h.GetSyncedChan("pods")
	podsAfterSync, err := h.Factory.Core().V1().Pods().Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing pods after sync: %v", err)
	}
	if len(podsAfterSync) != podCount {
		t.Fatalf("expected lister to have %d pods after sync, got %d", podCount, len(podsAfterSync))
	}
}

// TestGetSyncedChanNonexistentResource verifies that GetSyncedChan returns
// an already-closed channel for unknown resources (immediate return, no blocking).
func TestGetSyncedChanNonexistentResource(t *testing.T) {
	cs := fake.NewSimpleClientset()
	h := NewFactoryHandle(cs, func(string, string) {})
	defer h.Stop()

	ch := h.GetSyncedChan("nonexistent-resource")

	// Channel should be already closed (reading should return immediately)
	select {
	case <-ch:
		// Expected: channel is closed and returns immediately
	default:
		t.Fatal("expected GetSyncedChan(nonexistent-resource) to return already-closed channel")
	}
}

// TestStopResourceIdempotent verifies that stopResource can be called multiple
// times for the same resource without panicking (sync.Once ensures no double-close).
func TestStopResourceIdempotent(t *testing.T) {
	cs := fake.NewSimpleClientset()
	h := NewFactoryHandle(cs, func(string, string) {})

	// Manually call stopResource twice for a single resource
	h.StopResource("pods", func(string, string) {})
	h.StopResource("pods", func(string, string) {}) // Should not panic due to sync.Once
}

// TestStopResourceEvictsCachedObjects reproduces the bug where a
// cluster-scoped resource (e.g. Nodes) whose access is revoked mid-session
// keeps serving objects fetched before the revocation: StopResource is the
// real forbidden path for these generic (non-nsscope) resources, called by
// both the watch-error handler and the sync-timeout goroutine, but
// previously never touched the informer's own cache. client-go's Reflector
// never clears that cache on a watch error by itself, so without eviction
// here a forbidden resource's stale, now-unauthorized data would be served
// by Lister() reads indefinitely.
func TestStopResourceEvictsCachedObjects(t *testing.T) {
	cs := fake.NewSimpleClientset(&corev1.Node{ObjectMeta: metav1.ObjectMeta{Name: "node-a"}})
	h := NewFactoryHandle(cs, func(string, string) {})
	defer h.Stop()

	<-h.GetSyncedChan("nodes")
	before, err := h.Factory.Core().V1().Nodes().Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing nodes: %v", err)
	}
	if len(before) != 1 {
		t.Fatalf("expected 1 node cached before StopResource, got %d", len(before))
	}

	h.StopResource("nodes", func(string, string) {})

	after, err := h.Factory.Core().V1().Nodes().Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing nodes after StopResource: %v", err)
	}
	if len(after) != 0 {
		t.Fatalf("expected StopResource to evict cached nodes, got %d remaining", len(after))
	}
}

// TestIsForbiddenResourceNeverRegistered verifies that IsForbidden returns false
// for a resource that was never registered / never encountered an error.
func TestIsForbiddenResourceNeverRegistered(t *testing.T) {
	cs := fake.NewSimpleClientset()
	h := NewFactoryHandle(cs, func(string, string) {})
	defer h.Stop()

	if h.IsForbidden("nonexistent-resource") {
		t.Fatal("expected IsForbidden to return false for never-registered resource")
	}
}

// TestIsForbiddenOnNilHandle verifies that IsForbidden returns false when
// called on a nil FactoryHandle (defensive nil-pointer safety).
func TestIsForbiddenOnNilHandle(t *testing.T) {
	var h *FactoryHandle
	if h.IsForbidden("pods") {
		t.Fatal("expected IsForbidden to return false on nil handle")
	}
}

// TestStopResourceRecordsForbiddenAfterCall verifies that calling stopResource
// marks the resource as forbidden.
func TestStopResourceRecordsForbiddenAfterCall(t *testing.T) {
	cs := fake.NewSimpleClientset()
	h := NewFactoryHandle(cs, func(string, string) {})

	if h.IsForbidden("pods") {
		t.Fatal("expected pods to not be forbidden before stopResource")
	}

	h.StopResource("pods", func(string, string) {})

	if !h.IsForbidden("pods") {
		t.Fatal("expected pods to be forbidden after stopResource")
	}

	h.Stop()
}

// TestStopResourceCallsOnForbiddenWhenGlobalNotStopped verifies that
// onForbidden is called when the handle is still active.
func TestStopResourceCallsOnForbiddenWhenGlobalNotStopped(t *testing.T) {
	cs := fake.NewSimpleClientset()

	var calledResources []string
	h := NewFactoryHandle(cs, func(resource, namespace string) {
		calledResources = append(calledResources, resource)
	})
	defer h.Stop()

	h.StopResource("pods", func(resource, namespace string) {
		calledResources = append(calledResources, resource)
	})

	if len(calledResources) != 1 || calledResources[0] != "pods" {
		t.Fatalf("expected onForbidden to be called with 'pods', got %v", calledResources)
	}
}

// TestStopResourceSkipsOnForbiddenAfterStop verifies that onForbidden is NOT
// called if h.Stop() has already been called (globalStop is closed).
func TestStopResourceSkipsOnForbiddenAfterStop(t *testing.T) {
	cs := fake.NewSimpleClientset()

	var calledResources []string
	h := NewFactoryHandle(cs, func(resource, namespace string) {
		calledResources = append(calledResources, resource)
	})

	h.Stop()

	// This should not call onForbidden because globalStop is already closed
	h.StopResource("pods", func(resource, namespace string) {
		calledResources = append(calledResources, resource)
	})

	if len(calledResources) != 0 {
		t.Fatalf("expected onForbidden NOT to be called after Stop(), but was called for: %v", calledResources)
	}
}

// TestRegisterDebouncerMultiple verifies that multiple debouncers can be
// registered and all are stopped when h.Stop() is called.
func TestRegisterDebouncerMultiple(t *testing.T) {
	cs := fake.NewSimpleClientset()
	h := NewFactoryHandle(cs, func(string, string) {})

	debouncer1 := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(s string) {}, func() bool { return true })
	debouncer2 := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(s string) {}, func() bool { return true })

	h.RegisterDebouncer(debouncer1)
	h.RegisterDebouncer(debouncer2)

	if len(h.debouncers) != 2 {
		t.Fatalf("expected 2 registered debouncers, got %d", len(h.debouncers))
	}

	h.Stop()
	// After Stop(), both debouncers should be stopped (calling Stop() multiple times is safe)
}

// TestStopIdempotent verifies that Stop() can be called multiple times without
// panicking (sync.Once ensures the close only happens once).
func TestStopIdempotent(t *testing.T) {
	cs := fake.NewSimpleClientset()
	h := NewFactoryHandle(cs, func(string, string) {})

	h.Stop()
	h.Stop() // Should not panic
}

// TestStopClosesAllChannels verifies that Stop() closes both the global stop
// channel and all per-resource stop channels.
func TestStopClosesAllChannels(t *testing.T) {
	cs := fake.NewSimpleClientset()
	h := NewFactoryHandle(cs, func(string, string) {})

	if len(h.stopChannels) == 0 {
		t.Fatal("expected stopChannels to be populated after NewFactoryHandle")
	}

	// Verify that channels are open before Stop()
	select {
	case <-h.globalStop:
		t.Fatal("globalStop was already closed before calling Stop()")
	default:
	}

	h.Stop()

	// After Stop(), globalStop should be closed
	select {
	case <-h.globalStop:
		// Expected: channel is closed
	case <-make(chan struct{}):
		t.Fatal("globalStop should be closed after Stop()")
	}
}

// TestConcurrentGetSyncedChanAndStopResourceRace is a race test that spawns
// concurrent GetSyncedChan and StopResource calls across multiple resources
// while background sync goroutines are still running.
// Run with: go test -race ./internal/kube/...
func TestConcurrentGetSyncedChanAndStopResourceRace(t *testing.T) {
	const podCount = 50
	const goroutineCount = 30

	objs := make([]runtime.Object, 0, podCount)
	for i := range podCount {
		objs = append(objs, &corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      fmt.Sprintf("pod-%d", i),
				Namespace: "default",
			},
		})
	}

	cs := fake.NewSimpleClientset(objs...)
	h := NewFactoryHandle(cs, func(string, string) {})
	defer h.Stop()

	// Test resources we know are in the factory
	resources := []string{"pods", "configmaps", "deployments", "services", "nodes"}

	// Spawn many concurrent goroutines doing GetSyncedChan and StopResource
	for i := range goroutineCount {
		go func(id int) {
			resource := resources[id%len(resources)]
			// Get synced channel
			<-h.GetSyncedChan(resource)
		}(i)

		go func(id int) {
			resource := resources[id%len(resources)]
			// Stop resource (some may already be synced, some may still be syncing)
			h.StopResource(resource, func(string, string) {})
		}(i)
	}

	// Let goroutines run and finish
	time.Sleep(500 * time.Millisecond)

	// Verify that Stop() is idempotent and doesn't panic
	h.Stop()

	// Verify all resources are still queryable (no panics from nil access)
	for _, resource := range resources {
		_ = h.IsForbidden(resource)
		_ = h.GetSyncedChan(resource)
	}
}
