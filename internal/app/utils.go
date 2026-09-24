package app

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/galacius/galacius/internal/kube"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/client-go/kubernetes"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
)

func (a *App) isActive(ctx string) bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.activeContext == ctx
}

// tryClaimConnectSeq reports whether seq is newer than every Connect call
// seen so far and, if so, claims it as the current one. A stale or duplicate
// seq (<=  the highest already claimed) is rejected without side effects, so
// the caller can bail out before doing any of Connect's slow client-building
// or informer-syncing work. See Connect.
func (a *App) tryClaimConnectSeq(seq int64) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	if seq <= a.activeContextSeq {
		return false
	}
	a.activeContextSeq = seq
	return true
}

// restoredNamespacesForContextLocked returns a fresh copy of contextName's
// persisted default namespace filter (from settings), or nil if none is
// saved (interpreted downstream as "all namespaces"). Called by Connect
// while a.mu is already held, to seed a.activeNamespaces on every connect —
// including a reconnect to the already-active context — rather than only on
// a genuine context switch. Returns a copy, not the settings slice itself,
// so mutating a.activeNamespaces later can never alias persisted settings
// state.
func (a *App) restoredNamespacesForContextLocked(contextName string) []string {
	return append([]string(nil), a.settings.ClusterDefaultNamespaces[contextName]...)
}

// activeClientset returns the clientset for the active context, or an error
// if there is no active connection.
func (a *App) activeClientset() (kubernetes.Interface, error) {
	a.mu.RLock()
	cs := a.clients[a.activeContext]
	a.mu.RUnlock()
	if cs == nil {
		return nil, fmt.Errorf("not connected")
	}
	return cs, nil
}

// activeFactory returns the informer factory handle for the active context,
// or nil if there is no active connection.
func (a *App) activeFactory() *kube.FactoryHandle {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.factories[a.activeContext]
}

// activeFactoryAndNamespaces returns the informer factory handle for the
// active context together with the active namespace filter.
func (a *App) activeFactoryAndNamespaces() (*kube.FactoryHandle, []string) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.factories[a.activeContext], a.activeNamespaces
}

// activeFactoryAndMetrics returns the informer factory handle and metrics
// client for the active context.
func (a *App) activeFactoryAndMetrics() (*kube.FactoryHandle, *metricsclient.Clientset) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.factories[a.activeContext], a.metricsClients[a.activeContext]
}

// activeFactoryNamespacesAndMetrics returns the informer factory handle,
// active namespace filter, and metrics client for the active context.
func (a *App) activeFactoryNamespacesAndMetrics() (*kube.FactoryHandle, []string, *metricsclient.Clientset) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.factories[a.activeContext], a.activeNamespaces, a.metricsClients[a.activeContext]
}

// waitForResourceSync blocks until resource's informer completes its initial
// sync, reporting whether the caller may proceed to read from its lister. It
// reports false if h is nil or resource is forbidden either before or after
// the wait.
func waitForResourceSync(h *kube.FactoryHandle, resource string) bool {
	if h == nil || h.IsForbidden(resource) {
		return false
	}
	<-h.GetSyncedChan(resource)
	return !h.IsForbidden(resource)
}

// waitForResourceSyncIgnoringForbidden blocks until resource's informer
// completes its initial sync, like waitForResourceSync, but does NOT treat
// a whole-resource forbidden flag as a reason to skip the wait or the read.
// A single namespace's 403 within a multi-namespace selection sets this
// flag for the whole resource (see nsscope.markForbidden), but the
// resource-layer List<Kind> functions already tolerate per-namespace
// errors individually — gating here would wipe out data from namespaces
// the caller DOES have access to. Reports false only if h is nil.
func waitForResourceSyncIgnoringForbidden(h *kube.FactoryHandle, resource string) bool {
	if h == nil {
		return false
	}
	<-h.GetSyncedChan(resource)
	return true
}

// waitForResourceSyncWithTimeout waits up to timeout for the resource's informer cache to sync.
// Returns true if synced within timeout, false otherwise. Captures the sync channel once
// (a namespace rescope mid-wait would otherwise swap in a fresh channel/timer).
func waitForResourceSyncWithTimeout(h *kube.FactoryHandle, resource string, timeout time.Duration) bool {
	if h == nil {
		return false
	}
	ch := h.GetSyncedChan(resource)
	select {
	case <-ch:
		return true
	case <-time.After(timeout):
		return false
	}
}

// deleteRefsBestEffort deletes each item in items via deleteFn, continuing
// past not-found and other per-item errors instead of aborting on the first
// one. kind names the resource (plural, lowercase) for the aggregated error
// message. namespaceOf is nil for cluster-scoped resources, which have no
// namespace to pass to deleteFn or include in a failure label.
func deleteRefsBestEffort[T any](
	items []T,
	namespaceOf func(T) string,
	nameOf func(T) string,
	kind string,
	deleteFn func(ctx context.Context, namespace, name string) error,
) error {
	var msgs []string
	for _, ref := range items {
		name := nameOf(ref)
		var ns, label string
		if namespaceOf != nil {
			ns = namespaceOf(ref)
			label = ns + "/" + name
		} else {
			label = name
		}
		ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
		err := deleteFn(ctx, ns, name)
		cancel()
		if err != nil && !errors.IsNotFound(err) {
			msgs = append(msgs, fmt.Sprintf("%s: %v", label, err))
		}
	}
	if len(msgs) > 0 {
		return fmt.Errorf("failed to delete %d of %d %s: %s", len(msgs), len(items), kind, strings.Join(msgs, "; "))
	}
	return nil
}
