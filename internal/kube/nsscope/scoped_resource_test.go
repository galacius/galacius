package nsscope

import (
	"fmt"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	corev1informers "k8s.io/client-go/informers/core/v1"
	"k8s.io/client-go/kubernetes/fake"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	kubetesting "k8s.io/client-go/testing"
	"k8s.io/client-go/tools/cache"
)

// The tests below exercise the generic engine using Pods as a concrete,
// realistic instantiation — resource-specific glue lives in the parent kube
// package's pods.go, but the rebuild/swap/fallback logic under test here is
// entirely generic.

func newPod(namespace, name string) *corev1.Pod {
	return &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

type multiPodLister struct {
	listers map[string]listerscorev1.PodLister
}

func (m *multiPodLister) List(selector labels.Selector) ([]*corev1.Pod, error) {
	var all []*corev1.Pod
	for _, l := range m.listers {
		pods, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, pods...)
	}
	return all, nil
}

func (m *multiPodLister) Pods(namespace string) listerscorev1.PodNamespaceLister {
	return m.listers[namespace].Pods(namespace)
}

func newTestScopedResource(cs *fake.Clientset) *ScopedResource[listerscorev1.PodLister] {
	return New(Config[listerscorev1.PodLister]{
		Name:          "pods",
		MaxNamespaces: 10,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredPodInformer(cs, ns, 0, indexers, nil)
		},
		NewClusterWideInformer: func() cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredPodInformer(cs, "", 0, indexers, nil)
		},
		BuildLister: func(indexer cache.Indexer) listerscorev1.PodLister {
			return listerscorev1.NewPodLister(indexer)
		},
		BuildMultiLister: func(m map[string]listerscorev1.PodLister) listerscorev1.PodLister {
			return &multiPodLister{listers: m}
		},
	})
}

func TestRescopeNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newPod("ns-a", "a1"), newPod("ns-a", "a2"),
		newPod("ns-b", "b1"), newPod("ns-b", "b2"), newPod("ns-b", "b3"),
		newPod("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	r := newTestScopedResource(cs)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing pods: %v", err)
	}
	if len(all) != 5 {
		t.Fatalf("expected 5 pods across ns-a/ns-b, got %d", len(all))
	}
	for _, p := range all {
		if p.Namespace == "ns-c" {
			t.Fatalf("expected no pods from unselected namespace ns-c, got %v", p)
		}
	}
}

func TestRescopeFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range 11 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newPod(ns, "pod"))
	}
	objs = append(objs, newPod("ns-other", "pod"))

	cs := fake.NewSimpleClientset(objs...)
	r := newTestScopedResource(cs)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing pods: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d pods, got %d", len(namespaces)+1, len(all))
	}
}

func TestRescopeNoOpWhenUnchanged(t *testing.T) {
	cs := fake.NewSimpleClientset()
	r := newTestScopedResource(cs)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()
	first := r.group

	r.Rescope([]string{"ns-b", "ns-a"})
	if r.group != first {
		t.Fatal("expected Rescope to no-op for an equivalent (reordered) namespace set")
	}
}

func TestRescopeSwapStopsOldGroup(t *testing.T) {
	cs := fake.NewSimpleClientset()
	r := newTestScopedResource(cs)
	defer r.Stop()

	r.Rescope([]string{"ns-a"})
	<-r.SyncedChan()
	old := r.group

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	select {
	case <-old.stop:
		// Expected: superseded group's informers were stopped.
	default:
		t.Fatal("expected old group's stop channel to be closed after rescope")
	}
}

func TestMarkForbiddenIgnoresSupersededGroup(t *testing.T) {
	cs := fake.NewSimpleClientset()
	var forbiddenCalls []string
	r := New(Config[listerscorev1.PodLister]{
		Name:          "pods",
		MaxNamespaces: 10,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredPodInformer(cs, ns, 0, indexers, nil)
		},
		NewClusterWideInformer: func() cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredPodInformer(cs, "", 0, indexers, nil)
		},
		BuildLister: func(indexer cache.Indexer) listerscorev1.PodLister {
			return listerscorev1.NewPodLister(indexer)
		},
		BuildMultiLister: func(m map[string]listerscorev1.PodLister) listerscorev1.PodLister {
			return &multiPodLister{listers: m}
		},
		OnForbidden: func(name, _ string) { forbiddenCalls = append(forbiddenCalls, name) },
	})
	defer r.Stop()

	r.Rescope([]string{"ns-a"})
	<-r.SyncedChan()
	old := r.group

	r.Rescope([]string{"ns-b"})
	<-r.SyncedChan()

	// Simulate the old (superseded, already-stopped) group's sync-wait
	// discovering a failure after the swap — it must not poison the new
	// group's forbidden state.
	r.markForbidden(old, 0, "ns-a")

	if len(forbiddenCalls) != 0 {
		t.Fatalf("expected superseded group's failure to be ignored, got OnForbidden calls: %v", forbiddenCalls)
	}
}

// TestMarkForbiddenOnlyStopsItsOwnNamespace reproduces the multi-namespace
// bug: when namespaces ns-a (permitted) and ns-b (forbidden) are both active,
// ns-b's informer failing must not stop ns-a's sibling informer in the same
// group. Before the per-namespace nsStop split, markForbidden closed the
// group's single shared stop channel, killing every namespace's informer
// (and therefore future updates) the moment any one of them was denied.
func TestMarkForbiddenOnlyStopsItsOwnNamespace(t *testing.T) {
	cs := fake.NewSimpleClientset()
	var forbiddenCalls []struct{ name, namespace string }
	r := New(Config[listerscorev1.PodLister]{
		Name:          "pods",
		MaxNamespaces: 10,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredPodInformer(cs, ns, 0, indexers, nil)
		},
		NewClusterWideInformer: func() cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredPodInformer(cs, "", 0, indexers, nil)
		},
		BuildLister: func(indexer cache.Indexer) listerscorev1.PodLister {
			return listerscorev1.NewPodLister(indexer)
		},
		BuildMultiLister: func(m map[string]listerscorev1.PodLister) listerscorev1.PodLister {
			return &multiPodLister{listers: m}
		},
		OnForbidden: func(name, namespace string) {
			forbiddenCalls = append(forbiddenCalls, struct{ name, namespace string }{name, namespace})
		},
	})
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()
	g := r.group

	// Simulate ns-b's watch failing with a 403 (idx 1, since Rescope sorts
	// namespaces alphabetically: ns-a=0, ns-b=1).
	r.markForbidden(g, 1, "ns-b")

	if len(forbiddenCalls) != 1 || forbiddenCalls[0].namespace != "ns-b" {
		t.Fatalf("expected exactly one OnForbidden call for ns-b, got %v", forbiddenCalls)
	}

	select {
	case <-g.nsStop[1]:
		// Expected: ns-b's own informer was stopped.
	default:
		t.Fatal("expected ns-b's private stop channel to be closed")
	}
	select {
	case <-g.nsStop[0]:
		t.Fatal("expected ns-a's informer to keep running after ns-b was marked forbidden")
	default:
		// Expected: ns-a's informer is untouched.
	}
	select {
	case <-g.stop:
		t.Fatal("expected the group's shared stop channel to remain open")
	default:
		// Expected.
	}
}

// TestForbiddenWatchEvictsCachedObjects reproduces the bug where access to a
// resource (e.g. Secrets) is revoked mid-session: the informer's watch fails
// with a 403, OnForbidden fires (driving the frontend's "access denied"
// toast), but objects fetched before the revocation were still being served
// by Lister() reads indefinitely, since client-go's Reflector never clears
// its own cache on a watch error. Rescope's real watch pipeline can't be
// driven directly against a fake clientset's cache-independent 403, so this
// exercises the same evictIndexer helper the watch-error handlers call,
// against a populated indexer built the same way ScopedResource builds one.
func TestForbiddenWatchEvictsCachedObjects(t *testing.T) {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	if err := indexer.Add(newPod("ns-a", "a1")); err != nil {
		t.Fatalf("failed to seed indexer: %v", err)
	}
	if err := indexer.Add(newPod("ns-a", "a2")); err != nil {
		t.Fatalf("failed to seed indexer: %v", err)
	}
	if len(indexer.List()) != 2 {
		t.Fatalf("expected indexer to be seeded with 2 objects, got %d", len(indexer.List()))
	}

	evictIndexer(indexer)

	if got := len(indexer.List()); got != 0 {
		t.Fatalf("expected evictIndexer to clear the cache, got %d objects remaining", got)
	}
}

// TestSyncedChanDoesNotWaitFullTimeoutForForbiddenNamespace reproduces the
// SecretsView performance bug: when one namespace in a multi-namespace
// selection is RBAC-forbidden, its per-namespace informer is stopped almost
// immediately by markForbidden (via its own nsStop[i]) — but buildGroup's
// sync-wait goroutine polls cache.WaitForCacheSync against every informer's
// HasSynced, gated only by the group's shared stop channel or the full
// SyncTimeout. A forbidden informer's HasSynced never becomes true once it's
// stopped early, so SyncedChan() (and therefore every caller blocking on it —
// ListSecrets, GetSecretByName, emitSecrets, emitSecretDetail) was stuck
// waiting the entire SyncTimeout on every Rescope, even though the permitted
// sibling namespace(s) synced instantly.
func TestSyncedChanDoesNotWaitFullTimeoutForForbiddenNamespace(t *testing.T) {
	cs := fake.NewSimpleClientset(newPod("ns-a", "a1"))
	cs.PrependReactor("list", "pods", func(action kubetesting.Action) (bool, runtime.Object, error) {
		la, ok := action.(kubetesting.ListAction)
		if ok && la.GetNamespace() == "ns-b" {
			return true, nil, apierrors.NewForbidden(corev1.Resource("pods"), "", fmt.Errorf("denied"))
		}
		return false, nil, nil
	})

	const syncTimeout = 2 * time.Second
	r := New(Config[listerscorev1.PodLister]{
		Name:          "pods",
		MaxNamespaces: 10,
		SyncTimeout:   syncTimeout,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredPodInformer(cs, ns, 0, indexers, nil)
		},
		NewClusterWideInformer: func() cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredPodInformer(cs, "", 0, indexers, nil)
		},
		BuildLister: func(indexer cache.Indexer) listerscorev1.PodLister {
			return listerscorev1.NewPodLister(indexer)
		},
		BuildMultiLister: func(m map[string]listerscorev1.PodLister) listerscorev1.PodLister {
			return &multiPodLister{listers: m}
		},
	})
	defer r.Stop()

	start := time.Now()
	r.Rescope([]string{"ns-a", "ns-b"})
	select {
	case <-r.SyncedChan():
	case <-time.After(syncTimeout - 200*time.Millisecond):
		t.Fatal("SyncedChan blocked for nearly the full SyncTimeout despite ns-b's informer being stopped early — expected it to give up as soon as ns-b was marked forbidden")
	}
	elapsed := time.Since(start)

	if elapsed >= syncTimeout/2 {
		t.Fatalf("expected SyncedChan to close well before SyncTimeout (%v) once ns-b was marked forbidden, took %v", syncTimeout, elapsed)
	}

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing pods: %v", err)
	}
	if len(all) != 1 || all[0].Namespace != "ns-a" {
		t.Fatalf("expected only ns-a's pod to be visible, got %v", all)
	}
}
