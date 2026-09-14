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

const maxNamespaceScopedEventInformers = 10
const eventResyncPeriod = 30 * time.Second

// NewEventsResource wires the generic ScopedResource engine up to Events
// specifically. See NewPodsResource for the parameter contract.
func NewEventsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscorev1.EventLister] {
	return New(Config[listerscorev1.EventLister]{
		Name:          "events",
		MaxNamespaces: maxNamespaceScopedEventInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredEventInformer(cs, ns, eventResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscorev1.EventLister {
			return listerscorev1.NewEventLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscorev1.EventLister) listerscorev1.EventLister {
			return &multiNamespaceEventLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceEventLister struct {
	listers map[string]listerscorev1.EventLister
}

func (m *multiNamespaceEventLister) List(selector labels.Selector) ([]*corev1.Event, error) {
	var all []*corev1.Event
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceEventLister) Events(namespace string) listerscorev1.EventNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.Events(namespace)
	}
	return emptyEventNamespaceLister{}
}

type emptyEventNamespaceLister struct{}

func (emptyEventNamespaceLister) List(labels.Selector) ([]*corev1.Event, error) {
	return nil, nil
}

func (emptyEventNamespaceLister) Get(name string) (*corev1.Event, error) {
	return nil, apierrors.NewNotFound(corev1.Resource("event"), name)
}
