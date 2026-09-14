package nsscope

import (
	"fmt"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	appsv1informers "k8s.io/client-go/informers/apps/v1"
	"k8s.io/client-go/kubernetes"
	listersappsv1 "k8s.io/client-go/listers/apps/v1"
	"k8s.io/client-go/tools/cache"
)

const maxNamespaceScopedReplicaSetInformers = 10
const replicaSetResyncPeriod = 30 * time.Second

// NewReplicaSetsResource wires the generic ScopedResource engine up to
// ReplicaSets specifically. See NewPodsResource for the parameter contract.
func NewReplicaSetsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersappsv1.ReplicaSetLister] {
	return New(Config[listersappsv1.ReplicaSetLister]{
		Name:          "replicasets",
		MaxNamespaces: maxNamespaceScopedReplicaSetInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return appsv1informers.NewFilteredReplicaSetInformer(cs, ns, replicaSetResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersappsv1.ReplicaSetLister {
			return listersappsv1.NewReplicaSetLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersappsv1.ReplicaSetLister) listersappsv1.ReplicaSetLister {
			return &multiNamespaceReplicaSetLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceReplicaSetLister struct {
	listers map[string]listersappsv1.ReplicaSetLister
}

func (m *multiNamespaceReplicaSetLister) List(selector labels.Selector) ([]*appsv1.ReplicaSet, error) {
	var all []*appsv1.ReplicaSet
	for _, l := range m.listers {
		rs, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, rs...)
	}
	return all, nil
}

func (m *multiNamespaceReplicaSetLister) ReplicaSets(namespace string) listersappsv1.ReplicaSetNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.ReplicaSets(namespace)
	}
	return emptyReplicaSetNamespaceLister{}
}

// GetPodReplicaSets is purely namespace-scoped in client-go's own
// implementation (it only ever consults s.ReplicaSets(pod.Namespace)), so
// delegating to the one namespace-scoped sub-lister that actually holds that
// namespace's data reproduces the same result.
func (m *multiNamespaceReplicaSetLister) GetPodReplicaSets(pod *corev1.Pod) ([]*appsv1.ReplicaSet, error) {
	if l, ok := m.listers[pod.Namespace]; ok {
		return l.GetPodReplicaSets(pod)
	}
	return nil, fmt.Errorf("no ReplicaSets found for pod %s: namespace %s not in scope", pod.Name, pod.Namespace)
}

type emptyReplicaSetNamespaceLister struct{}

func (emptyReplicaSetNamespaceLister) List(labels.Selector) ([]*appsv1.ReplicaSet, error) {
	return nil, nil
}

func (emptyReplicaSetNamespaceLister) Get(name string) (*appsv1.ReplicaSet, error) {
	return nil, apierrors.NewNotFound(appsv1.Resource("replicaset"), name)
}
