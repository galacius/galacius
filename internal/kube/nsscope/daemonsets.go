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

const maxNamespaceScopedDaemonSetInformers = 10
const daemonSetResyncPeriod = 30 * time.Second

// NewDaemonSetsResource wires the generic ScopedResource engine up to
// DaemonSets specifically. See NewPodsResource for the parameter contract.
func NewDaemonSetsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersappsv1.DaemonSetLister] {
	return New(Config[listersappsv1.DaemonSetLister]{
		Name:          "daemonsets",
		MaxNamespaces: maxNamespaceScopedDaemonSetInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return appsv1informers.NewFilteredDaemonSetInformer(cs, ns, daemonSetResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersappsv1.DaemonSetLister {
			return listersappsv1.NewDaemonSetLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersappsv1.DaemonSetLister) listersappsv1.DaemonSetLister {
			return &multiNamespaceDaemonSetLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceDaemonSetLister struct {
	listers map[string]listersappsv1.DaemonSetLister
}

func (m *multiNamespaceDaemonSetLister) List(selector labels.Selector) ([]*appsv1.DaemonSet, error) {
	var all []*appsv1.DaemonSet
	for _, l := range m.listers {
		ds, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, ds...)
	}
	return all, nil
}

func (m *multiNamespaceDaemonSetLister) DaemonSets(namespace string) listersappsv1.DaemonSetNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.DaemonSets(namespace)
	}
	return emptyDaemonSetNamespaceLister{}
}

// GetPodDaemonSets and GetHistoryDaemonSets are both purely namespace-scoped
// in client-go's own implementation (they only ever consult
// s.DaemonSets(<the object's namespace>)), so delegating to the one
// namespace-scoped sub-lister that actually holds the target namespace's
// data reproduces the same result.
func (m *multiNamespaceDaemonSetLister) GetPodDaemonSets(pod *corev1.Pod) ([]*appsv1.DaemonSet, error) {
	if l, ok := m.listers[pod.Namespace]; ok {
		return l.GetPodDaemonSets(pod)
	}
	return nil, fmt.Errorf("no daemon sets found for pod %s: namespace %s not in scope", pod.Name, pod.Namespace)
}

func (m *multiNamespaceDaemonSetLister) GetHistoryDaemonSets(history *appsv1.ControllerRevision) ([]*appsv1.DaemonSet, error) {
	if l, ok := m.listers[history.Namespace]; ok {
		return l.GetHistoryDaemonSets(history)
	}
	return nil, fmt.Errorf("no daemon sets found for ControllerRevision %s: namespace %s not in scope", history.Name, history.Namespace)
}

type emptyDaemonSetNamespaceLister struct{}

func (emptyDaemonSetNamespaceLister) List(labels.Selector) ([]*appsv1.DaemonSet, error) {
	return nil, nil
}

func (emptyDaemonSetNamespaceLister) Get(name string) (*appsv1.DaemonSet, error) {
	return nil, apierrors.NewNotFound(appsv1.Resource("daemonset"), name)
}
