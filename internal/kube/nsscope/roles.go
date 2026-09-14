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

const maxNamespaceScopedRoleInformers = 10
const roleResyncPeriod = 30 * time.Second

// NewRolesResource wires the generic ScopedResource engine up to Roles
// specifically. See NewPodsResource for the parameter contract.
func NewRolesResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersrbacv1.RoleLister] {
	return New(Config[listersrbacv1.RoleLister]{
		Name:          "roles",
		MaxNamespaces: maxNamespaceScopedRoleInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return rbacv1informers.NewFilteredRoleInformer(cs, ns, roleResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersrbacv1.RoleLister {
			return listersrbacv1.NewRoleLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersrbacv1.RoleLister) listersrbacv1.RoleLister {
			return &multiNamespaceRoleLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceRoleLister struct {
	listers map[string]listersrbacv1.RoleLister
}

func (m *multiNamespaceRoleLister) List(selector labels.Selector) ([]*rbacv1.Role, error) {
	var all []*rbacv1.Role
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespaceRoleLister) Roles(namespace string) listersrbacv1.RoleNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.Roles(namespace)
	}
	return emptyRoleNamespaceLister{}
}

type emptyRoleNamespaceLister struct{}

func (emptyRoleNamespaceLister) List(labels.Selector) ([]*rbacv1.Role, error) {
	return nil, nil
}

func (emptyRoleNamespaceLister) Get(name string) (*rbacv1.Role, error) {
	return nil, apierrors.NewNotFound(rbacv1.Resource("role"), name)
}
