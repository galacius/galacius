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

const maxNamespaceScopedStatefulSetInformers = 10
const statefulSetResyncPeriod = 30 * time.Second

// NewStatefulSetsResource wires the generic ScopedResource engine up to
// StatefulSets specifically. See NewPodsResource for the parameter contract.
func NewStatefulSetsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersappsv1.StatefulSetLister] {
	return New(Config[listersappsv1.StatefulSetLister]{
		Name:          "statefulsets",
		MaxNamespaces: maxNamespaceScopedStatefulSetInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return appsv1informers.NewFilteredStatefulSetInformer(cs, ns, statefulSetResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersappsv1.StatefulSetLister {
			return listersappsv1.NewStatefulSetLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersappsv1.StatefulSetLister) listersappsv1.StatefulSetLister {
			return &multiNamespaceStatefulSetLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceStatefulSetLister struct {
	listers map[string]listersappsv1.StatefulSetLister
}

func (m *multiNamespaceStatefulSetLister) List(selector labels.Selector) ([]*appsv1.StatefulSet, error) {
	var all []*appsv1.StatefulSet
	for _, l := range m.listers {
		ss, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, ss...)
	}
	return all, nil
}

func (m *multiNamespaceStatefulSetLister) StatefulSets(namespace string) listersappsv1.StatefulSetNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.StatefulSets(namespace)
	}
	return emptyStatefulSetNamespaceLister{}
}

// GetPodStatefulSets is purely namespace-scoped in client-go's own
// implementation (it only ever consults s.StatefulSets(pod.Namespace)), so
// delegating to the one namespace-scoped sub-lister that actually holds that
// namespace's data reproduces the same result.
func (m *multiNamespaceStatefulSetLister) GetPodStatefulSets(pod *corev1.Pod) ([]*appsv1.StatefulSet, error) {
	if l, ok := m.listers[pod.Namespace]; ok {
		return l.GetPodStatefulSets(pod)
	}
	return nil, fmt.Errorf("no StatefulSets found for pod %s: namespace %s not in scope", pod.Name, pod.Namespace)
}

type emptyStatefulSetNamespaceLister struct{}

func (emptyStatefulSetNamespaceLister) List(labels.Selector) ([]*appsv1.StatefulSet, error) {
	return nil, nil
}

func (emptyStatefulSetNamespaceLister) Get(name string) (*appsv1.StatefulSet, error) {
	return nil, apierrors.NewNotFound(appsv1.Resource("statefulset"), name)
}
