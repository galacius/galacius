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

const maxNamespaceScopedServiceInformers = 10
const serviceResyncPeriod = 30 * time.Second

// NewServicesResource wires the generic ScopedResource engine up to
// Services specifically. See NewPodsResource for the parameter contract.
func NewServicesResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscorev1.ServiceLister] {
	return New(Config[listerscorev1.ServiceLister]{
		Name:          "services",
		MaxNamespaces: maxNamespaceScopedServiceInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredServiceInformer(cs, ns, serviceResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscorev1.ServiceLister {
			return listerscorev1.NewServiceLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscorev1.ServiceLister) listerscorev1.ServiceLister {
			return &multiNamespaceServiceLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceServiceLister struct {
	listers map[string]listerscorev1.ServiceLister
}

func (m *multiNamespaceServiceLister) List(selector labels.Selector) ([]*corev1.Service, error) {
	var all []*corev1.Service
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceServiceLister) Services(namespace string) listerscorev1.ServiceNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.Services(namespace)
	}
	return emptyServiceNamespaceLister{}
}

type emptyServiceNamespaceLister struct{}

func (emptyServiceNamespaceLister) List(labels.Selector) ([]*corev1.Service, error) {
	return nil, nil
}

func (emptyServiceNamespaceLister) Get(name string) (*corev1.Service, error) {
	return nil, apierrors.NewNotFound(corev1.Resource("service"), name)
}
