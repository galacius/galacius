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

const maxNamespaceScopedEndpointsInformers = 10
const endpointsResyncPeriod = 30 * time.Second

// NewEndpointsResource wires the generic ScopedResource engine up to
// Endpoints specifically. See NewPodsResource for the parameter contract.
func NewEndpointsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscorev1.EndpointsLister] {
	return New(Config[listerscorev1.EndpointsLister]{
		Name:          "endpoints",
		MaxNamespaces: maxNamespaceScopedEndpointsInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredEndpointsInformer(cs, ns, endpointsResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscorev1.EndpointsLister {
			return listerscorev1.NewEndpointsLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscorev1.EndpointsLister) listerscorev1.EndpointsLister {
			return &multiNamespaceEndpointsLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceEndpointsLister struct {
	listers map[string]listerscorev1.EndpointsLister
}

//lint:ignore SA1019 matches production glue, which targets the deprecated v1 API.
func (m *multiNamespaceEndpointsLister) List(selector labels.Selector) ([]*corev1.Endpoints, error) {
	//lint:ignore SA1019 matches production glue, which targets the deprecated v1 API.
	var all []*corev1.Endpoints
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceEndpointsLister) Endpoints(namespace string) listerscorev1.EndpointsNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.Endpoints(namespace)
	}
	return emptyEndpointsNamespaceLister{}
}

type emptyEndpointsNamespaceLister struct{}

//lint:ignore SA1019 matches production glue, which targets the deprecated v1 API.
func (emptyEndpointsNamespaceLister) List(labels.Selector) ([]*corev1.Endpoints, error) {
	return nil, nil
}

//lint:ignore SA1019 matches production glue, which targets the deprecated v1 API.
func (emptyEndpointsNamespaceLister) Get(name string) (*corev1.Endpoints, error) {
	return nil, apierrors.NewNotFound(corev1.Resource("endpoints"), name)
}
