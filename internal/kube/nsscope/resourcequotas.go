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

const maxNamespaceScopedResourceQuotaInformers = 10
const resourceQuotaResyncPeriod = 30 * time.Second

// NewResourceQuotasResource wires the generic ScopedResource engine up to
// ResourceQuotas specifically. See NewPodsResource for the parameter contract.
func NewResourceQuotasResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscorev1.ResourceQuotaLister] {
	return New(Config[listerscorev1.ResourceQuotaLister]{
		Name:          "resourcequotas",
		MaxNamespaces: maxNamespaceScopedResourceQuotaInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredResourceQuotaInformer(cs, ns, resourceQuotaResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscorev1.ResourceQuotaLister {
			return listerscorev1.NewResourceQuotaLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscorev1.ResourceQuotaLister) listerscorev1.ResourceQuotaLister {
			return &multiNamespaceResourceQuotaLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceResourceQuotaLister struct {
	listers map[string]listerscorev1.ResourceQuotaLister
}

func (m *multiNamespaceResourceQuotaLister) List(selector labels.Selector) ([]*corev1.ResourceQuota, error) {
	var all []*corev1.ResourceQuota
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceResourceQuotaLister) ResourceQuotas(namespace string) listerscorev1.ResourceQuotaNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.ResourceQuotas(namespace)
	}
	return emptyResourceQuotaNamespaceLister{}
}

type emptyResourceQuotaNamespaceLister struct{}

func (emptyResourceQuotaNamespaceLister) List(labels.Selector) ([]*corev1.ResourceQuota, error) {
	return nil, nil
}

func (emptyResourceQuotaNamespaceLister) Get(name string) (*corev1.ResourceQuota, error) {
	return nil, apierrors.NewNotFound(corev1.Resource("resourcequota"), name)
}
