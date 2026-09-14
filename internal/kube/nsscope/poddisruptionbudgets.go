package nsscope

import (
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	policyv1 "k8s.io/api/policy/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	policyv1informers "k8s.io/client-go/informers/policy/v1"
	"k8s.io/client-go/kubernetes"
	listerspolicyv1 "k8s.io/client-go/listers/policy/v1"
	"k8s.io/client-go/tools/cache"
)

const maxNamespaceScopedPodDisruptionBudgetInformers = 10
const podDisruptionBudgetResyncPeriod = 30 * time.Second

// NewPodDisruptionBudgetsResource wires the generic ScopedResource engine up
// to PodDisruptionBudgets specifically. See NewPodsResource for the
// parameter contract.
func NewPodDisruptionBudgetsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listerspolicyv1.PodDisruptionBudgetLister] {
	return New(Config[listerspolicyv1.PodDisruptionBudgetLister]{
		Name:          "pdbs",
		MaxNamespaces: maxNamespaceScopedPodDisruptionBudgetInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return policyv1informers.NewFilteredPodDisruptionBudgetInformer(cs, ns, podDisruptionBudgetResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listerspolicyv1.PodDisruptionBudgetLister {
			return listerspolicyv1.NewPodDisruptionBudgetLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listerspolicyv1.PodDisruptionBudgetLister) listerspolicyv1.PodDisruptionBudgetLister {
			return &multiNamespacePodDisruptionBudgetLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespacePodDisruptionBudgetLister struct {
	listers map[string]listerspolicyv1.PodDisruptionBudgetLister
}

func (m *multiNamespacePodDisruptionBudgetLister) List(selector labels.Selector) ([]*policyv1.PodDisruptionBudget, error) {
	var all []*policyv1.PodDisruptionBudget
	for _, l := range m.listers {
		items, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
	}
	return all, nil
}

func (m *multiNamespacePodDisruptionBudgetLister) PodDisruptionBudgets(namespace string) listerspolicyv1.PodDisruptionBudgetNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.PodDisruptionBudgets(namespace)
	}
	return emptyPodDisruptionBudgetNamespaceLister{}
}

// GetPodPodDisruptionBudgets is purely namespace-scoped in client-go's own
// implementation (it only ever calls s.PodDisruptionBudgets(pod.Namespace)),
// so delegating to the real per-namespace sub-lister is behavior-preserving.
func (m *multiNamespacePodDisruptionBudgetLister) GetPodPodDisruptionBudgets(pod *corev1.Pod) ([]*policyv1.PodDisruptionBudget, error) {
	if l, ok := m.listers[pod.Namespace]; ok {
		return l.GetPodPodDisruptionBudgets(pod)
	}
	return nil, fmt.Errorf("no PodDisruptionBudgets found for pod %s: namespace %s not in scope", pod.Name, pod.Namespace)
}

type emptyPodDisruptionBudgetNamespaceLister struct{}

func (emptyPodDisruptionBudgetNamespaceLister) List(labels.Selector) ([]*policyv1.PodDisruptionBudget, error) {
	return nil, nil
}

func (emptyPodDisruptionBudgetNamespaceLister) Get(name string) (*policyv1.PodDisruptionBudget, error) {
	return nil, apierrors.NewNotFound(policyv1.Resource("poddisruptionbudget"), name)
}
