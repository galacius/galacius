package nsscope

import (
	"time"

	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	networkingv1informers "k8s.io/client-go/informers/networking/v1"
	"k8s.io/client-go/kubernetes"
	listersnetworkingv1 "k8s.io/client-go/listers/networking/v1"
	"k8s.io/client-go/tools/cache"
)

const maxNamespaceScopedIngressInformers = 10
const ingressResyncPeriod = 30 * time.Second

// NewIngressesResource wires the generic ScopedResource engine up to
// Ingresses specifically. See NewPodsResource for the parameter contract.
func NewIngressesResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersnetworkingv1.IngressLister] {
	return New(Config[listersnetworkingv1.IngressLister]{
		Name:          "ingresses",
		MaxNamespaces: maxNamespaceScopedIngressInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return networkingv1informers.NewFilteredIngressInformer(cs, ns, ingressResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersnetworkingv1.IngressLister {
			return listersnetworkingv1.NewIngressLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersnetworkingv1.IngressLister) listersnetworkingv1.IngressLister {
			return &multiNamespaceIngressLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceIngressLister struct {
	listers map[string]listersnetworkingv1.IngressLister
}

func (m *multiNamespaceIngressLister) List(selector labels.Selector) ([]*networkingv1.Ingress, error) {
	var all []*networkingv1.Ingress
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceIngressLister) Ingresses(namespace string) listersnetworkingv1.IngressNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.Ingresses(namespace)
	}
	return emptyIngressNamespaceLister{}
}

type emptyIngressNamespaceLister struct{}

func (emptyIngressNamespaceLister) List(labels.Selector) ([]*networkingv1.Ingress, error) {
	return nil, nil
}

func (emptyIngressNamespaceLister) Get(name string) (*networkingv1.Ingress, error) {
	return nil, apierrors.NewNotFound(networkingv1.Resource("ingress"), name)
}
