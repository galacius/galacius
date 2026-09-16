package nsscope

import (
	"time"

	coordinationv1 "k8s.io/api/coordination/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	coordinationv1informers "k8s.io/client-go/informers/coordination/v1"
	"k8s.io/client-go/kubernetes"
	listerscoordinationv1 "k8s.io/client-go/listers/coordination/v1"
	"k8s.io/client-go/tools/cache"
)

const maxNamespaceScopedLeaseInformers = 10
const leaseResyncPeriod = 30 * time.Second

// NewLeasesResource wires the generic ScopedResource engine up to Leases
// specifically. See NewPodsResource for the parameter contract.
func NewLeasesResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscoordinationv1.LeaseLister] {
	return New(Config[listerscoordinationv1.LeaseLister]{
		Name:          "leases",
		MaxNamespaces: maxNamespaceScopedLeaseInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return coordinationv1informers.NewFilteredLeaseInformer(cs, ns, leaseResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscoordinationv1.LeaseLister {
			return listerscoordinationv1.NewLeaseLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscoordinationv1.LeaseLister) listerscoordinationv1.LeaseLister {
			return &multiNamespaceLeaseLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceLeaseLister struct {
	listers map[string]listerscoordinationv1.LeaseLister
}

func (m *multiNamespaceLeaseLister) List(selector labels.Selector) ([]*coordinationv1.Lease, error) {
	var all []*coordinationv1.Lease
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceLeaseLister) Leases(namespace string) listerscoordinationv1.LeaseNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.Leases(namespace)
	}
	return emptyLeaseNamespaceLister{}
}

type emptyLeaseNamespaceLister struct{}

func (emptyLeaseNamespaceLister) List(labels.Selector) ([]*coordinationv1.Lease, error) {
	return nil, nil
}

func (emptyLeaseNamespaceLister) Get(name string) (*coordinationv1.Lease, error) {
	return nil, apierrors.NewNotFound(coordinationv1.Resource("lease"), name)
}
