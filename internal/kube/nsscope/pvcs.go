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

const maxNamespaceScopedPVCInformers = 10
const pvcResyncPeriod = 30 * time.Second

// NewPersistentVolumeClaimsResource wires the generic ScopedResource engine
// up to PersistentVolumeClaims specifically. See NewPodsResource for the
// parameter contract.
func NewPersistentVolumeClaimsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscorev1.PersistentVolumeClaimLister] {
	return New(Config[listerscorev1.PersistentVolumeClaimLister]{
		Name:          "pvcs",
		MaxNamespaces: maxNamespaceScopedPVCInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredPersistentVolumeClaimInformer(cs, ns, pvcResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscorev1.PersistentVolumeClaimLister {
			return listerscorev1.NewPersistentVolumeClaimLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscorev1.PersistentVolumeClaimLister) listerscorev1.PersistentVolumeClaimLister {
			return &multiNamespacePVCLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespacePVCLister struct {
	listers map[string]listerscorev1.PersistentVolumeClaimLister
}

func (m *multiNamespacePVCLister) List(selector labels.Selector) ([]*corev1.PersistentVolumeClaim, error) {
	var all []*corev1.PersistentVolumeClaim
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespacePVCLister) PersistentVolumeClaims(namespace string) listerscorev1.PersistentVolumeClaimNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.PersistentVolumeClaims(namespace)
	}
	return emptyPVCNamespaceLister{}
}

type emptyPVCNamespaceLister struct{}

func (emptyPVCNamespaceLister) List(labels.Selector) ([]*corev1.PersistentVolumeClaim, error) {
	return nil, nil
}

func (emptyPVCNamespaceLister) Get(name string) (*corev1.PersistentVolumeClaim, error) {
	return nil, apierrors.NewNotFound(corev1.Resource("persistentvolumeclaim"), name)
}
