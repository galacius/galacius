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

const maxNamespaceScopedServiceAccountInformers = 10
const serviceAccountResyncPeriod = 30 * time.Second

// NewServiceAccountsResource wires the generic ScopedResource engine up to
// ServiceAccounts specifically. See NewPodsResource for the parameter
// contract.
func NewServiceAccountsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscorev1.ServiceAccountLister] {
	return New(Config[listerscorev1.ServiceAccountLister]{
		Name:          "serviceaccounts",
		MaxNamespaces: maxNamespaceScopedServiceAccountInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredServiceAccountInformer(cs, ns, serviceAccountResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscorev1.ServiceAccountLister {
			return listerscorev1.NewServiceAccountLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscorev1.ServiceAccountLister) listerscorev1.ServiceAccountLister {
			return &multiNamespaceServiceAccountLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceServiceAccountLister struct {
	listers map[string]listerscorev1.ServiceAccountLister
}

func (m *multiNamespaceServiceAccountLister) List(selector labels.Selector) ([]*corev1.ServiceAccount, error) {
	var all []*corev1.ServiceAccount
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceServiceAccountLister) ServiceAccounts(namespace string) listerscorev1.ServiceAccountNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.ServiceAccounts(namespace)
	}
	return emptyServiceAccountNamespaceLister{}
}

type emptyServiceAccountNamespaceLister struct{}

func (emptyServiceAccountNamespaceLister) List(labels.Selector) ([]*corev1.ServiceAccount, error) {
	return nil, nil
}

func (emptyServiceAccountNamespaceLister) Get(name string) (*corev1.ServiceAccount, error) {
	return nil, apierrors.NewNotFound(corev1.Resource("serviceaccount"), name)
}
