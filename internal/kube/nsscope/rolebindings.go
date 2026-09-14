package nsscope

import (
	"time"

	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	rbacv1informers "k8s.io/client-go/informers/rbac/v1"
	"k8s.io/client-go/kubernetes"
	listersrbacv1 "k8s.io/client-go/listers/rbac/v1"
	"k8s.io/client-go/tools/cache"
)

const maxNamespaceScopedRoleBindingInformers = 10
const roleBindingResyncPeriod = 30 * time.Second

// NewRoleBindingsResource wires the generic ScopedResource engine up to
// RoleBindings specifically. See NewPodsResource for the parameter
// contract.
func NewRoleBindingsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersrbacv1.RoleBindingLister] {
	return New(Config[listersrbacv1.RoleBindingLister]{
		Name:          "rolebindings",
		MaxNamespaces: maxNamespaceScopedRoleBindingInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return rbacv1informers.NewFilteredRoleBindingInformer(cs, ns, roleBindingResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersrbacv1.RoleBindingLister {
			return listersrbacv1.NewRoleBindingLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersrbacv1.RoleBindingLister) listersrbacv1.RoleBindingLister {
			return &multiNamespaceRoleBindingLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceRoleBindingLister struct {
	listers map[string]listersrbacv1.RoleBindingLister
}

func (m *multiNamespaceRoleBindingLister) List(selector labels.Selector) ([]*rbacv1.RoleBinding, error) {
	var all []*rbacv1.RoleBinding
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceRoleBindingLister) RoleBindings(namespace string) listersrbacv1.RoleBindingNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.RoleBindings(namespace)
	}
	return emptyRoleBindingNamespaceLister{}
}

type emptyRoleBindingNamespaceLister struct{}

func (emptyRoleBindingNamespaceLister) List(labels.Selector) ([]*rbacv1.RoleBinding, error) {
	return nil, nil
}

func (emptyRoleBindingNamespaceLister) Get(name string) (*rbacv1.RoleBinding, error) {
	return nil, apierrors.NewNotFound(rbacv1.Resource("rolebinding"), name)
}
