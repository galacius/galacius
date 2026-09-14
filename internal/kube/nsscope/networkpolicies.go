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

const maxNamespaceScopedNetworkPolicyInformers = 10
const networkPolicyResyncPeriod = 30 * time.Second

// NewNetworkPoliciesResource wires the generic ScopedResource engine up to
// NetworkPolicies specifically. See NewPodsResource for the parameter
// contract.
func NewNetworkPoliciesResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersnetworkingv1.NetworkPolicyLister] {
	return New(Config[listersnetworkingv1.NetworkPolicyLister]{
		Name:          "networkpolicies",
		MaxNamespaces: maxNamespaceScopedNetworkPolicyInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return networkingv1informers.NewFilteredNetworkPolicyInformer(cs, ns, networkPolicyResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersnetworkingv1.NetworkPolicyLister {
			return listersnetworkingv1.NewNetworkPolicyLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersnetworkingv1.NetworkPolicyLister) listersnetworkingv1.NetworkPolicyLister {
			return &multiNamespaceNetworkPolicyLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceNetworkPolicyLister struct {
	listers map[string]listersnetworkingv1.NetworkPolicyLister
}

func (m *multiNamespaceNetworkPolicyLister) List(selector labels.Selector) ([]*networkingv1.NetworkPolicy, error) {
	var all []*networkingv1.NetworkPolicy
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceNetworkPolicyLister) NetworkPolicies(namespace string) listersnetworkingv1.NetworkPolicyNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.NetworkPolicies(namespace)
	}
	return emptyNetworkPolicyNamespaceLister{}
}

type emptyNetworkPolicyNamespaceLister struct{}

func (emptyNetworkPolicyNamespaceLister) List(labels.Selector) ([]*networkingv1.NetworkPolicy, error) {
	return nil, nil
}

func (emptyNetworkPolicyNamespaceLister) Get(name string) (*networkingv1.NetworkPolicy, error) {
	return nil, apierrors.NewNotFound(networkingv1.Resource("networkpolicy"), name)
}
