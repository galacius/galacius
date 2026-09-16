// Package nsscope provides a generic, resource-agnostic engine for backing a
// client-go lister with either a single cluster-wide informer or a set of
// per-namespace informers, rebuildable at runtime as a caller's namespace
// filter changes. It exists because client-go's SharedInformerFactory only
// supports a single namespace scope for its entire lifetime
// (informers.WithNamespace), with no way to scope one resource type to a
// handful of namespaces without paying for a cluster-wide LIST — see
// FactoryHandle in the parent kube package, which was the original motivating
// use case (Pods).
//
// A ScopedResource is generic over L, the resource's client-go lister
// interface (e.g. k8s.io/client-go/listers/core/v1.PodLister). Callers
// supply the resource-specific glue (how to build a namespaced informer, a
// cluster-wide informer, a single-namespace lister, and a lister that fans
// out across several namespaces) via Config; ScopedResource owns the
// concurrency-safe swap/rebuild/stop lifecycle around those hooks.
package nsscope

import (
	"log"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	kmeta "k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/client-go/tools/cache"
)

// DefaultMaxNamespaces is used when Config.MaxNamespaces is zero.
const DefaultMaxNamespaces = 10

// DefaultSyncTimeout is used when Config.SyncTimeout is zero.
const DefaultSyncTimeout = 30 * time.Second

// group is the set of informer(s) currently backing a ScopedResource: either
// a single cluster-wide informer (namespaces == nil) or one namespace-scoped
// informer per entry in namespaces.
type group struct {
	namespaces []string // sorted; nil = cluster-wide
	informers  []cache.SharedIndexInformer
	stop       chan struct{}
	stopOnce   sync.Once
	synced     chan struct{}

	// nsStop/nsStopOnce hold one private stop channel per entry in
	// informers, used only when namespaces is non-empty. A namespace whose
	// informer is denied by RBAC is stopped by closing just its own
	// nsStop[i] (via markForbidden), independent of every other namespace's
	// informer in the same group — closing the shared stop above would kill
	// every namespace's informer just because one of them was forbidden,
	// which is exactly the bug this split avoids (see markForbidden).
	nsStop     []chan struct{}
	nsStopOnce []sync.Once
}

// Config holds the resource-specific hooks a ScopedResource needs. All
// function fields are required unless noted otherwise.
type Config[L any] struct {
	// Name identifies the resource for logging (e.g. "pods").
	Name string

	// MaxNamespaces caps how many per-namespace informers Rescope will
	// build before falling back to a single cluster-wide informer (N
	// separate LISTs cost more round trips than one cluster-wide LIST
	// beyond this point). Zero uses DefaultMaxNamespaces.
	MaxNamespaces int

	// SyncTimeout bounds how long Rescope's background sync-wait will wait
	// for a newly built group's informers to complete their initial LIST
	// before marking the resource forbidden. Zero uses DefaultSyncTimeout.
	SyncTimeout time.Duration

	// NewNamespacedInformer builds a single-namespace informer scoped to ns.
	NewNamespacedInformer func(ns string) cache.SharedIndexInformer

	// NewClusterWideInformer builds a single cluster-wide informer,
	// typically backed by a shared SharedInformerFactory so it's reused
	// across every consumer of that factory rather than duplicated.
	NewClusterWideInformer func() cache.SharedIndexInformer

	// BuildLister builds this resource's lister from one informer's
	// indexer. Used for both the cluster-wide informer and each
	// per-namespace informer.
	BuildLister func(indexer cache.Indexer) L

	// BuildMultiLister fans a set of per-namespace listers (keyed by
	// namespace) out into a single L satisfying the same lister interface.
	// Only called when Rescope is building more than one namespace-scoped
	// informer.
	BuildMultiLister func(listers map[string]L) L

	// ClearForbidden is called at the start of a Rescope call that will
	// actually rebuild the group (i.e. not a no-op), before the rebuild
	// starts, so a namespace-filter change gives a previously-forbidden
	// resource a clean slate to retry against. Optional.
	ClearForbidden func()

	// OnForbidden is called when one informer in the *current* group fails
	// (watch error containing "is forbidden"). namespace is the specific
	// namespace whose informer failed, or "" if the failing informer was
	// the cluster-wide one (namespaces == nil, i.e. every namespace is
	// covered by a single informer). Never called on behalf of a group
	// that's already been superseded by a later Rescope call. Optional.
	OnForbidden func(name string, namespace string)

	// GlobalStop bounds the lifetime of the cluster-wide informer
	// (NewClusterWideInformer) independently of any single group's stop
	// channel. NewClusterWideInformer is typically backed by a shared
	// SharedInformerFactory singleton — the same *SharedIndexInformer
	// instance is returned on every call — and client-go's
	// SharedIndexInformer.Run can only be started once per instance, so
	// ScopedResource builds it and calls Run exactly once, on the first
	// Rescope(nil) that needs it, and reuses it across every later
	// Rescope(nil) rather than rebuilding. Binding that one Run call to
	// GlobalStop (rather than the first group's own, transient stop
	// channel) lets the resource keep flipping between namespaced and
	// cluster-wide scope for its whole life instead of the cluster-wide
	// informer dying the first time the caller rescopes away from it.
	// Optional: nil falls back to the first cluster-wide group's own stop
	// channel, which is fine for tests and other short-lived resources
	// but will permanently stop a production resource's cluster-wide view
	// the first time it's superseded by a namespaced Rescope.
	GlobalStop <-chan struct{}
}

// ScopedResource manages a swappable set of namespace-scoped (or single
// cluster-wide) SharedIndexInformers for one resource type, rebuilt on
// demand via Rescope. Safe for concurrent use.
type ScopedResource[L any] struct {
	cfg Config[L]

	mu           sync.RWMutex
	group        *group
	lister       L
	eventHandler func(namespace string)

	// clusterInformer, once built, is reused across every Rescope(nil)
	// call instead of rebuilt — see Config.GlobalStop. Guarded by
	// clusterMu, separate from mu (which guards the swappable group),
	// since acquireClusterInformer must not block concurrent Lister()/
	// SyncedChan reads of the current group.
	clusterMu       sync.Mutex
	clusterInformer cache.SharedIndexInformer
}

// New constructs a ScopedResource and bootstraps it with a cluster-wide
// group (equivalent to Rescope(nil)), so Lister/SyncedChan never observe an
// unset state.
func New[L any](cfg Config[L]) *ScopedResource[L] {
	if cfg.MaxNamespaces <= 0 {
		cfg.MaxNamespaces = DefaultMaxNamespaces
	}
	if cfg.SyncTimeout <= 0 {
		cfg.SyncTimeout = DefaultSyncTimeout
	}
	r := &ScopedResource[L]{cfg: cfg}
	r.Rescope(nil)
	return r
}

// Rescope (re)builds the informer(s) backing this resource to cover exactly
// the given namespaces, replacing whatever was there before. nil, an empty
// slice, or more than Config.MaxNamespaces namespaces falls back to a single
// cluster-wide informer. A no-op if the requested scope already matches the
// current one.
//
// Safe to call at any time, including concurrently with reads via
// Lister/SyncedChan — callers always see either the old group or the fully
// built new one, never a half-built one.
func (r *ScopedResource[L]) Rescope(namespaces []string) {
	target := normalize(namespaces, r.cfg.MaxNamespaces)

	r.mu.RLock()
	current := r.group
	r.mu.RUnlock()
	if current != nil && sameNamespaces(current.namespaces, target) {
		return
	}

	if r.cfg.ClearForbidden != nil {
		r.cfg.ClearForbidden()
	}

	g := r.buildGroup(target)

	r.mu.Lock()
	old := r.group
	r.group = g
	r.lister = r.buildLister(g)
	r.mu.Unlock()

	if old != nil {
		old.stopOnce.Do(func() { close(old.stop) })
	}
}

// SetEventHandler registers fn to be called with the namespace of every
// add/update/delete observed by the current and any future informer(s) this
// resource builds (i.e. it survives Rescope rebuilds).
func (r *ScopedResource[L]) SetEventHandler(fn func(namespace string)) {
	r.mu.Lock()
	r.eventHandler = fn
	r.mu.Unlock()
}

// Lister returns the current lister, scoped exactly as configured by the
// most recent Rescope call (or cluster-wide if Rescope has never been called
// directly — New bootstraps a cluster-wide default).
func (r *ScopedResource[L]) Lister() L {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.lister
}

// SyncedChan returns a channel that closes once the current group's initial
// cache sync completes (or times out/fails).
func (r *ScopedResource[L]) SyncedChan() <-chan struct{} {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.group != nil {
		return r.group.synced
	}
	ch := make(chan struct{})
	close(ch)
	return ch
}

// Stop stops the current group's informer(s). Safe to call multiple times
// and concurrently with Rescope.
func (r *ScopedResource[L]) Stop() {
	r.mu.RLock()
	g := r.group
	r.mu.RUnlock()
	if g != nil {
		g.stopOnce.Do(func() { close(g.stop) })
	}
}

func (r *ScopedResource[L]) buildGroup(namespaces []string) *group {
	g := &group{
		namespaces: namespaces,
		stop:       make(chan struct{}),
		synced:     make(chan struct{}),
	}

	handler := cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj any) { r.fireEvent(objNamespace(obj)) },
		UpdateFunc: func(_, newObj any) { r.fireEvent(objNamespace(newObj)) },
		DeleteFunc: func(obj any) { r.fireEvent(objNamespace(obj)) },
	}

	if len(namespaces) == 0 {
		inf, isNew := r.acquireClusterInformer()
		g.informers = []cache.SharedIndexInformer{inf}
		if isNew {
			//nolint:errcheck — only fails if already started, which it isn't yet
			inf.AddEventHandler(handler)
			//nolint:errcheck — only fails if already started, which it isn't yet
			inf.SetWatchErrorHandler(func(_ *cache.Reflector, err error) {
				if strings.Contains(err.Error(), "is forbidden") {
					evictIndexer(inf.GetIndexer())
					r.markForbiddenShared(inf)
				}
			})
			runStop := r.cfg.GlobalStop
			if runStop == nil {
				runStop = g.stop
			}
			go inf.Run(runStop)
		}
	} else {
		g.informers = make([]cache.SharedIndexInformer, len(namespaces))
		g.nsStop = make([]chan struct{}, len(namespaces))
		g.nsStopOnce = make([]sync.Once, len(namespaces))
		for i, ns := range namespaces {
			inf := r.cfg.NewNamespacedInformer(ns)
			g.informers[i] = inf
			g.nsStop[i] = make(chan struct{})
			//nolint:errcheck — only fails if already started, which it isn't yet
			inf.AddEventHandler(handler)
			idx, namespace := i, ns // capture for closure
			//nolint:errcheck — only fails if already started, which it isn't yet
			inf.SetWatchErrorHandler(func(_ *cache.Reflector, err error) {
				if strings.Contains(err.Error(), "is forbidden") {
					evictIndexer(inf.GetIndexer())
					r.markForbidden(g, idx, namespace)
				}
			})
			go inf.Run(orDone(g.stop, g.nsStop[i]))
		}
	}

	syncFuncs := make([]cache.InformerSynced, len(g.informers))
	for i, inf := range g.informers {
		if len(g.nsStop) == 0 {
			// Cluster-wide group: a single informer, no per-namespace stop
			// channel to race against. A forbidden cluster-wide informer
			// closes the whole group's shared stop instead (see
			// markForbiddenShared), which the sync-wait goroutine below
			// already selects on via stopOrTimeout.
			syncFuncs[i] = inf.HasSynced
			continue
		}
		// A namespace marked forbidden has its informer stopped almost
		// immediately via its own nsStop[i] (see markForbidden), but a
		// stopped informer's HasSynced never becomes true — without this,
		// cache.WaitForCacheSync below would keep polling a permanently-false
		// syncFunc for that namespace until the full SyncTimeout elapses on
		// every Rescope, even though every permitted sibling namespace
		// synced instantly. Treat "stopped" as "resolved, stop waiting on
		// this one" so the group's overall sync completes as soon as every
		// namespace is either synced or given up on.
		hasSynced, nsStop := inf.HasSynced, g.nsStop[i]
		syncFuncs[i] = func() bool {
			select {
			case <-nsStop:
				return true
			default:
				return hasSynced()
			}
		}
	}

	go func() {
		stopOrTimeout := make(chan struct{})
		go func() {
			timer := time.NewTimer(r.cfg.SyncTimeout)
			defer timer.Stop()
			select {
			case <-g.stop:
			case <-timer.C:
			}
			close(stopOrTimeout)
		}()
		cache.WaitForCacheSync(stopOrTimeout, syncFuncs...)
		for _, inf := range g.informers {
			if !inf.HasSynced() {
				// A timeout here is not proof of a permission problem — it's
				// also what a burst of many concurrent per-namespace
				// informers (e.g. several namespaces selected across ~24
				// resource kinds at once) looks like under load. A genuine
				// RBAC denial is already caught above by the watch error
				// handler's "is forbidden" match, which calls markForbidden
				// (and stops these informers) directly. So a bare timeout
				// just logs and lets the informer(s) keep running in the
				// background to finish syncing — callers waiting on
				// SyncedChan proceed now (possibly against a still-filling
				// cache) rather than being told the resource is forbidden.
				log.Printf("kube/nsscope: cache sync timed out for %q — continuing in background", r.cfg.Name)
				break
			}
		}
		close(g.synced)
	}()

	return g
}

func (r *ScopedResource[L]) buildLister(g *group) L {
	if len(g.namespaces) == 0 {
		return r.cfg.BuildLister(g.informers[0].GetIndexer())
	}
	m := make(map[string]L, len(g.namespaces))
	for i, ns := range g.namespaces {
		m[ns] = r.cfg.BuildLister(g.informers[i].GetIndexer())
	}
	return r.cfg.BuildMultiLister(m)
}

// acquireClusterInformer returns the cluster-wide informer, building it on
// the first call and reusing that same instance on every later one — see
// Config.GlobalStop for why. The returned bool reports whether this call
// built it (i.e. its Run/event-handler wiring in buildGroup still needs to
// happen) or returned an already-wired, already-running instance.
func (r *ScopedResource[L]) acquireClusterInformer() (cache.SharedIndexInformer, bool) {
	r.clusterMu.Lock()
	defer r.clusterMu.Unlock()
	if r.clusterInformer != nil {
		return r.clusterInformer, false
	}
	r.clusterInformer = r.cfg.NewClusterWideInformer()
	return r.clusterInformer, true
}

// markForbidden records namespace (one of g's namespaces, identified by
// idx) as forbidden and notifies OnForbidden — but only if g is still the
// current group (an older, already-superseded group's failure shouldn't
// override a newer, healthy one). Stops only g.informers[idx] (via its own
// private g.nsStop[idx]), leaving every other namespace's informer in g
// running — a single namespace's RBAC denial must not take down sibling
// namespaces the caller does have access to. Used by namespace-scoped
// informers, which are freshly built per group so a captured *group
// pointer always correctly identifies "is this failure about the current
// group". See markForbiddenShared for the cluster-wide informer's
// counterpart, which can't rely on a captured pointer since it's reused
// (and its handler registered only once) across groups.
func (r *ScopedResource[L]) markForbidden(g *group, idx int, namespace string) {
	g.nsStopOnce[idx].Do(func() { close(g.nsStop[idx]) })

	r.mu.RLock()
	current := r.group == g
	r.mu.RUnlock()
	if !current {
		// g was already superseded by a later Rescope call — its failure
		// (e.g. sync timeout because it got stopped mid-sync) says nothing
		// about the current group's health.
		return
	}

	if r.cfg.OnForbidden != nil {
		r.cfg.OnForbidden(r.cfg.Name, namespace)
	}
}

// markForbiddenShared is markForbidden's counterpart for the cluster-wide
// informer. That informer is built once and reused across every
// Rescope(nil) call, so its watch-error handler is registered exactly once
// (in buildGroup, only when acquireClusterInformer reports isNew) and can't
// capture "the current group" the way a namespace-scoped informer's handler
// does — a later Rescope(nil) call builds a new *group around the same
// reused informer without re-registering a handler. So instead of comparing
// a captured *group pointer, this checks whether inf (the specific informer
// the firing handler is watching) is still part of the current group by
// identity.
func (r *ScopedResource[L]) markForbiddenShared(inf cache.SharedIndexInformer) {
	r.mu.RLock()
	g := r.group
	current := g != nil && containsInformer(g.informers, inf)
	r.mu.RUnlock()
	if !current {
		return
	}

	g.stopOnce.Do(func() { close(g.stop) })

	if r.cfg.OnForbidden != nil {
		// namespaces == nil here (that's what routes to the cluster-wide
		// informer in buildGroup), so "" means every namespace is covered
		// by the one informer that just failed — there's no narrower
		// namespace to blame.
		r.cfg.OnForbidden(r.cfg.Name, "")
	}
}

func containsInformer(informers []cache.SharedIndexInformer, target cache.SharedIndexInformer) bool {
	return slices.Contains(informers, target)
}

// orDone returns a channel that closes as soon as either a or b closes —
// used to run each per-namespace informer on a channel that reflects both
// "the whole group was superseded/stopped" (a) and "just this namespace was
// marked forbidden" (b) without requiring the two to share one channel.
func orDone(a, b <-chan struct{}) <-chan struct{} {
	out := make(chan struct{})
	go func() {
		defer close(out)
		select {
		case <-a:
		case <-b:
		}
	}()
	return out
}

// evictIndexer removes every object currently cached in indexer. Called when
// an informer's watch fails with "is forbidden" — client-go's Reflector
// preserves the last-known-good cache on a watch error by design (correct
// for a transient network blip), but that means objects fetched before RBAC
// access was revoked would otherwise keep being served by Lister() reads
// indefinitely, with no signal to the caller that they're now stale and
// unauthorized.
func evictIndexer(indexer cache.Indexer) {
	for _, obj := range indexer.List() {
		_ = indexer.Delete(obj)
	}
}

func (r *ScopedResource[L]) fireEvent(namespace string) {
	r.mu.RLock()
	fn := r.eventHandler
	r.mu.RUnlock()
	if fn != nil {
		fn(namespace)
	}
}

func normalize(namespaces []string, max int) []string {
	if len(namespaces) == 0 || len(namespaces) > max {
		return nil
	}
	out := append([]string(nil), namespaces...)
	sort.Strings(out)
	return out
}

func sameNamespaces(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func objNamespace(obj any) string {
	if d, ok := obj.(cache.DeletedFinalStateUnknown); ok {
		obj = d.Obj
	}
	if o, err := kmeta.Accessor(obj); err == nil {
		return o.GetNamespace()
	}
	return ""
}
