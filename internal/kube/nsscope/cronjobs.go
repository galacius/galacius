package nsscope

import (
	"time"

	batchv1 "k8s.io/api/batch/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/labels"
	batchv1informers "k8s.io/client-go/informers/batch/v1"
	"k8s.io/client-go/kubernetes"
	listersbatchv1 "k8s.io/client-go/listers/batch/v1"
	"k8s.io/client-go/tools/cache"
)

const maxNamespaceScopedCronJobInformers = 10
const cronJobResyncPeriod = 30 * time.Second

// NewCronJobsResource wires the generic ScopedResource engine up to CronJobs
// specifically. See NewPodsResource for the parameter contract.
func NewCronJobsResource(
	cs kubernetes.Interface,
	newClusterWideInformer func() cache.SharedIndexInformer,
	clearForbidden func(),
	onForbidden func(name, namespace string),
	globalStop <-chan struct{},
) *ScopedResource[listersbatchv1.CronJobLister] {
	return New(Config[listersbatchv1.CronJobLister]{
		Name:          "cronjobs",
		MaxNamespaces: maxNamespaceScopedCronJobInformers,
		NewNamespacedInformer: func(ns string) cache.SharedIndexInformer {
			indexers := cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc}
			return batchv1informers.NewFilteredCronJobInformer(cs, ns, cronJobResyncPeriod, indexers, nil)
		},
		NewClusterWideInformer: newClusterWideInformer,
		BuildLister: func(indexer cache.Indexer) listersbatchv1.CronJobLister {
			return listersbatchv1.NewCronJobLister(indexer)
		},
		BuildMultiLister: func(listers map[string]listersbatchv1.CronJobLister) listersbatchv1.CronJobLister {
			return &multiNamespaceCronJobLister{listers: listers}
		},
		ClearForbidden: clearForbidden,
		OnForbidden:    onForbidden,
		GlobalStop:     globalStop,
	})
}

type multiNamespaceCronJobLister struct {
	listers map[string]listersbatchv1.CronJobLister
}

func (m *multiNamespaceCronJobLister) List(selector labels.Selector) ([]*batchv1.CronJob, error) {
	var all []*batchv1.CronJob
	for _, l := range m.listers {
		cronJobs, err := l.List(selector)
		if err != nil {
			return nil, err
		}
		all = append(all, cronJobs...)
	}
	return all, nil
}

func (m *multiNamespaceCronJobLister) CronJobs(namespace string) listersbatchv1.CronJobNamespaceLister {
	if l, ok := m.listers[namespace]; ok {
		return l.CronJobs(namespace)
	}
	return emptyCronJobNamespaceLister{}
}

type emptyCronJobNamespaceLister struct{}

func (emptyCronJobNamespaceLister) List(labels.Selector) ([]*batchv1.CronJob, error) {
	return nil, nil
}

func (emptyCronJobNamespaceLister) Get(name string) (*batchv1.CronJob, error) {
	return nil, apierrors.NewNotFound(batchv1.Resource("cronjob"), name)
}
