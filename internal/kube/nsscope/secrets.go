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

const maxNamespaceScopedSecretInformers = 10
const secretResyncPeriod = 30 * time.Second

// NewSecretsResource wires the generic ScopedResource engine up to Secrets
// specifically. See NewPodsResource for the parameter contract.
func NewSecretsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerscorev1.SecretLister] {
	return New(Config[listerscorev1.SecretLister]{
		Name:          "secrets",
		MaxNamespaces: maxNamespaceScopedSecretInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return corev1informers.NewFilteredSecretInformer(cs, ns, secretResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerscorev1.SecretLister {
			return listerscorev1.NewSecretLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerscorev1.SecretLister) listerscorev1.SecretLister {
			return &multiNamespaceSecretLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceSecretLister struct {
	listers map[string]listerscorev1.SecretLister
}

func (m *multiNamespaceSecretLister) List(selector labels.Selector) ([]*corev1.Secret, error) {
	var all []*corev1.Secret
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceSecretLister) Secrets(namespace string) listerscorev1.SecretNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.Secrets(namespace)
	}
	return emptySecretNamespaceLister{}
}

type emptySecretNamespaceLister struct{}

func (emptySecretNamespaceLister) List(labels.Selector) ([]*corev1.Secret, error) {
	return nil, nil
}

func (emptySecretNamespaceLister) Get(name string) (*corev1.Secret, error) {
	return nil, apierrors.NewNotFound(corev1.Resource("secret"), name)
}
