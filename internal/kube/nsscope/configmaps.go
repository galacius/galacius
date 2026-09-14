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

const maxNamespaceScopedConfigMapInformers = 10
const configMapResyncPeriod = 30 * time.Second

// NewConfigMapsResource wires the generic ScopedResource engine up to
// ConfigMaps specifically. See NewPodsResource for the parameter contract.
func NewConfigMapsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscorev1.ConfigMapLister] {
	return New(Config[listerscorev1.ConfigMapLister]{
		Name:          "configmaps",
		MaxNamespaces: maxNamespaceScopedConfigMapInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredConfigMapInformer(cs, ns, configMapResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscorev1.ConfigMapLister {
			return listerscorev1.NewConfigMapLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscorev1.ConfigMapLister) listerscorev1.ConfigMapLister {
			return &multiNamespaceConfigMapLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceConfigMapLister struct {
	listers map[string]listerscorev1.ConfigMapLister
}

func (m *multiNamespaceConfigMapLister) List(selector labels.Selector) ([]*corev1.ConfigMap, error) {
	var all []*corev1.ConfigMap
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceConfigMapLister) ConfigMaps(namespace string) listerscorev1.ConfigMapNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.ConfigMaps(namespace)
	}
	return emptyConfigMapNamespaceLister{}
}

type emptyConfigMapNamespaceLister struct{}

func (emptyConfigMapNamespaceLister) List(labels.Selector) ([]*corev1.ConfigMap, error) {
	return nil, nil
}

func (emptyConfigMapNamespaceLister) Get(name string) (*corev1.ConfigMap, error) {
	return nil, apierrors.NewNotFound(corev1.Resource("configmap"), name)
}
