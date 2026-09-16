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

const maxNamespaceScopedLimitRangeInformers = 10
const limitRangeResyncPeriod = 30 * time.Second

// NewLimitRangesResource wires the generic ScopedResource engine up to
// LimitRanges specifically. See NewPodsResource for the parameter contract.
func NewLimitRangesResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscorev1.LimitRangeLister] {
	return New(Config[listerscorev1.LimitRangeLister]{
		Name:          "limitranges",
		MaxNamespaces: maxNamespaceScopedLimitRangeInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredLimitRangeInformer(cs, ns, limitRangeResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscorev1.LimitRangeLister {
			return listerscorev1.NewLimitRangeLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscorev1.LimitRangeLister) listerscorev1.LimitRangeLister {
			return &multiNamespaceLimitRangeLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceLimitRangeLister struct {
	listers map[string]listerscorev1.LimitRangeLister
}

func (m *multiNamespaceLimitRangeLister) List(selector labels.Selector) ([]*corev1.LimitRange, error) {
	var all []*corev1.LimitRange
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceLimitRangeLister) LimitRanges(namespace string) listerscorev1.LimitRangeNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.LimitRanges(namespace)
	}
	return emptyLimitRangeNamespaceLister{}
}

type emptyLimitRangeNamespaceLister struct{}

func (emptyLimitRangeNamespaceLister) List(labels.Selector) ([]*corev1.LimitRange, error) {
	return nil, nil
}

func (emptyLimitRangeNamespaceLister) Get(name string) (*corev1.LimitRange, error) {
	return nil, apierrors.NewNotFound(corev1.Resource("limitrange"), name)
}
