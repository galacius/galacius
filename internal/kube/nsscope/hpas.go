package nsscope

import (
	"time"

	autoscalingv2 "k8s.io/api/autoscaling/v2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	autoscalingv2informers "k8s.io/client-go/informers/autoscaling/v2"
	"k8s.io/client-go/kubernetes"
	listersautoscalingv2 "k8s.io/client-go/listers/autoscaling/v2"
	"k8s.io/client-go/tools/cache"
)

const maxNamespaceScopedHPAInformers = 10
const hpaResyncPeriod = 30 * time.Second

// NewHorizontalPodAutoscalersResource wires the generic ScopedResource engine
// up to HorizontalPodAutoscalers specifically. See NewPodsResource for the
// parameter contract.
func NewHorizontalPodAutoscalersResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersautoscalingv2.HorizontalPodAutoscalerLister] {
	return New(Config[listersautoscalingv2.HorizontalPodAutoscalerLister]{
		Name:          "hpa",
		MaxNamespaces: maxNamespaceScopedHPAInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return autoscalingv2informers.NewFilteredHorizontalPodAutoscalerInformer(cs, ns, hpaResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersautoscalingv2.HorizontalPodAutoscalerLister {
			return listersautoscalingv2.NewHorizontalPodAutoscalerLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersautoscalingv2.HorizontalPodAutoscalerLister) listersautoscalingv2.HorizontalPodAutoscalerLister {
			return &multiNamespaceHPALister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceHPALister struct {
	listers map[string]listersautoscalingv2.HorizontalPodAutoscalerLister
}

func (m *multiNamespaceHPALister) List(selector labels.Selector) ([]*autoscalingv2.HorizontalPodAutoscaler, error) {
	var all []*autoscalingv2.HorizontalPodAutoscaler
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceHPALister) HorizontalPodAutoscalers(namespace string) listersautoscalingv2.HorizontalPodAutoscalerNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.HorizontalPodAutoscalers(namespace)
	}
	return emptyHPANamespaceLister{}
}

type emptyHPANamespaceLister struct{}

func (emptyHPANamespaceLister) List(labels.Selector) ([]*autoscalingv2.HorizontalPodAutoscaler, error) {
	return nil, nil
}

func (emptyHPANamespaceLister) Get(name string) (*autoscalingv2.HorizontalPodAutoscaler, error) {
	return nil, apierrors.NewNotFound(autoscalingv2.Resource("horizontalpodautoscaler"), name)
}
