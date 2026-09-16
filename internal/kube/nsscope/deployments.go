package nsscope

import (
	"time"

	appsv1 "k8s.io/api/apps/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	appsv1informers "k8s.io/client-go/informers/apps/v1"
	"k8s.io/client-go/kubernetes"
	listersappsv1 "k8s.io/client-go/listers/apps/v1"
	"k8s.io/client-go/tools/cache"
)

const maxNamespaceScopedDeploymentInformers = 10
const deploymentResyncPeriod = 30 * time.Second

// NewDeploymentsResource wires the generic ScopedResource engine up to
// Deployments specifically. See NewPodsResource for the parameter contract.
func NewDeploymentsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersappsv1.DeploymentLister] {
	return New(Config[listersappsv1.DeploymentLister]{
		Name:          "deployments",
		MaxNamespaces: maxNamespaceScopedDeploymentInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return appsv1informers.NewFilteredDeploymentInformer(cs, ns, deploymentResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersappsv1.DeploymentLister {
			return listersappsv1.NewDeploymentLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersappsv1.DeploymentLister) listersappsv1.DeploymentLister {
			return &multiNamespaceDeploymentLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceDeploymentLister struct {
	listers map[string]listersappsv1.DeploymentLister
}

func (m *multiNamespaceDeploymentLister) List(selector labels.Selector) ([]*appsv1.Deployment, error) {
	var all []*appsv1.Deployment
	for _, l := range m.listers {
		deps, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, deps...)
	}
	return all, nil
}

func (m *multiNamespaceDeploymentLister) Deployments(namespace string) listersappsv1.DeploymentNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.Deployments(namespace)
	}
	return emptyDeploymentNamespaceLister{}
}

type emptyDeploymentNamespaceLister struct{}

func (emptyDeploymentNamespaceLister) List(labels.Selector) ([]*appsv1.Deployment, error) {
	return nil, nil
}

func (emptyDeploymentNamespaceLister) Get(name string) (*appsv1.Deployment, error) {
	return nil, apierrors.NewNotFound(appsv1.Resource("deployment"), name)
}
