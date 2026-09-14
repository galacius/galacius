package nsscope

import (
	"fmt"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	batchv1informers "k8s.io/client-go/informers/batch/v1"
	"k8s.io/client-go/kubernetes"
	listersbatchv1 "k8s.io/client-go/listers/batch/v1"
	"k8s.io/client-go/tools/cache"
)

const maxNamespaceScopedJobInformers = 10
const jobResyncPeriod = 30 * time.Second

// NewJobsResource wires the generic ScopedResource engine up to Jobs
// specifically. See NewPodsResource for the parameter contract.
func NewJobsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersbatchv1.JobLister] {
	return New(Config[listersbatchv1.JobLister]{
		Name:          "jobs",
		MaxNamespaces: maxNamespaceScopedJobInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return batchv1informers.NewFilteredJobInformer(cs, ns, jobResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersbatchv1.JobLister {
			return listersbatchv1.NewJobLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersbatchv1.JobLister) listersbatchv1.JobLister {
			return &multiNamespaceJobLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceJobLister struct {
	listers map[string]listersbatchv1.JobLister
}

func (m *multiNamespaceJobLister) List(selector labels.Selector) ([]*batchv1.Job, error) {
	var all []*batchv1.Job
	for _, l := range m.listers {
		jobs, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, jobs...)
	}
	return all, nil
}

func (m *multiNamespaceJobLister) Jobs(namespace string) listersbatchv1.JobNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.Jobs(namespace)
	}
	return emptyJobNamespaceLister{}
}

// GetPodJobs is purely namespace-scoped in client-go's own implementation
// (it only ever consults s.Jobs(pod.Namespace)), so delegating to the one
// namespace-scoped sub-lister that actually holds that namespace's data
// reproduces the same result.
func (m *multiNamespaceJobLister) GetPodJobs(pod *corev1.Pod) ([]batchv1.Job, error) {
	if l, ok := m.listers[pod.Namespace]; ok {
		return l.GetPodJobs(pod)
	}
	return nil, fmt.Errorf("no jobs found for pod %s: namespace %s not in scope", pod.Name, pod.Namespace)
}

type emptyJobNamespaceLister struct{}

func (emptyJobNamespaceLister) List(labels.Selector) ([]*batchv1.Job, error) { return nil, nil }

func (emptyJobNamespaceLister) Get(name string) (*batchv1.Job, error) {
	return nil, apierrors.NewNotFound(batchv1.Resource("job"), name)
}
