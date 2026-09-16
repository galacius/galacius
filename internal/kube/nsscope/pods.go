package nsscope

import (
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	corev1informers "k8s.io/client-go/informers/core/v1"
	"k8s.io/client-go/kubernetes"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	"k8s.io/client-go/tools/cache"
)

// maxNamespaceScopedPodInformers caps how many per-namespace Pod informers
// NewPodsResource's Rescope will create. Beyond this, N separate
// namespace-scoped LISTs cost more round trips than a single cluster-wide
// LIST, so it falls back to cluster-wide instead.
const maxNamespaceScopedPodInformers = 10

// podResyncPeriod is the resync period for namespace-scoped Pod informers.
// These are built independently of any shared factory, so it just matches
// SharedInformerFactory's own default resync period.
const podResyncPeriod = 30 * time.Second

// NewPodsResource wires the generic ScopedResource engine up to Pods
// specifically: how to build a namespaced/cluster-wide Pod informer, how to
// build a PodLister from one, and how to fan several PodListers out across
// namespaces (multiNamespacePodLister below).
//
// newClusterWideInformer is expected to return an informer backed by a
// shared SharedInformerFactory the caller already owns (so it's reused
// across every consumer of that factory), typically
// `factory.Core().V1().Pods().Informer()`.
//
// clearForbidden and onForbidden are optional hooks a caller can use to
// integrate its own forbidden-resource bookkeeping (e.g. a shared
// sync.Map keyed by resource name) — see Config.ClearForbidden/OnForbidden.
func NewPodsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscorev1.PodLister] {
	return New(Config[listerscorev1.PodLister]{
		Name:          "pods",
		MaxNamespaces: maxNamespaceScopedPodInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredPodInformer(cs, ns, podResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscorev1.PodLister {
			return listerscorev1.NewPodLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscorev1.PodLister) listerscorev1.PodLister {
			return &multiNamespacePodLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

// multiNamespacePodLister implements listerscorev1.PodLister by fanning out
// across one single-namespace lister per namespace in the current Rescope
// target set — the read-side counterpart to ScopedResource's per-namespace
// informers.
type multiNamespacePodLister struct {
	listers map[string]listerscorev1.PodLister
}

func (m *multiNamespacePodLister) List(selector labels.Selector) ([]*corev1.Pod, error) {
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

func (m *multiNamespacePodLister) Pods(namespace string) listerscorev1.PodNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.Pods(namespace)
	}
	// Reachable only if a caller races ahead of a rescope with a namespace
	// outside the current target set.
	return emptyPodNamespaceLister{}
}

// emptyPodNamespaceLister is returned for a namespace outside the current
// Rescope target set.
type emptyPodNamespaceLister struct{}

func (emptyPodNamespaceLister) List(labels.Selector) ([]*corev1.Pod, error) { return nil, nil }

func (emptyPodNamespaceLister) Get(name string) (*corev1.Pod, error) {
	return nil, apierrors.NewNotFound(corev1.Resource("pod"), name)
}
