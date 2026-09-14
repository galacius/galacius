package nsscope

import (
	"time"

	discoveryv1 "k8s.io/api/discovery/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	discoveryv1informers "k8s.io/client-go/informers/discovery/v1"
	"k8s.io/client-go/kubernetes"
	listersdiscoveryv1 "k8s.io/client-go/listers/discovery/v1"
	"k8s.io/client-go/tools/cache"
)

const maxNamespaceScopedEndpointSliceInformers = 10
const endpointSliceResyncPeriod = 30 * time.Second

// NewEndpointSlicesResource wires the generic ScopedResource engine up to
// EndpointSlices specifically. See NewPodsResource for the parameter
// contract.
func NewEndpointSlicesResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersdiscoveryv1.EndpointSliceLister] {
	return New(Config[listersdiscoveryv1.EndpointSliceLister]{
		Name:          "endpointslices",
		MaxNamespaces: maxNamespaceScopedEndpointSliceInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return discoveryv1informers.NewFilteredEndpointSliceInformer(cs, ns, endpointSliceResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersdiscoveryv1.EndpointSliceLister {
			return listersdiscoveryv1.NewEndpointSliceLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersdiscoveryv1.EndpointSliceLister) listersdiscoveryv1.EndpointSliceLister {
			return &multiNamespaceEndpointSliceLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceEndpointSliceLister struct {
	listers map[string]listersdiscoveryv1.EndpointSliceLister
}

func (m *multiNamespaceEndpointSliceLister) List(selector labels.Selector) ([]*discoveryv1.EndpointSlice, error) {
	var all []*discoveryv1.EndpointSlice
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceEndpointSliceLister) EndpointSlices(namespace string) listersdiscoveryv1.EndpointSliceNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.EndpointSlices(namespace)
	}
	return emptyEndpointSliceNamespaceLister{}
}

type emptyEndpointSliceNamespaceLister struct{}

func (emptyEndpointSliceNamespaceLister) List(labels.Selector) ([]*discoveryv1.EndpointSlice, error) {
	return nil, nil
}

func (emptyEndpointSliceNamespaceLister) Get(name string) (*discoveryv1.EndpointSlice, error) {
	return nil, apierrors.NewNotFound(discoveryv1.Resource("endpointslice"), name)
}
