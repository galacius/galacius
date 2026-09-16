package nsscope

import (
	"fmt"
	"testing"

	batchv1 "k8s.io/api/batch/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newCronJob(namespace, name string) *batchv1.CronJob {
	return &batchv1.CronJob{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewCronJobsResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newCronJob("ns-a", "a1"), newCronJob("ns-a", "a2"),
		newCronJob("ns-b", "b1"),
		newCronJob("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewCronJobsResource(cs, func() cache.SharedIndexInformer { return factory.Batch().V1().CronJobs().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing cronjobs: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 cronjobs across ns-a/ns-b, got %d", len(all))
	}
	for _, c := range all {
		if c.Namespace == "ns-c" {
			t.Fatalf("expected no cronjobs from unselected namespace ns-c, got %v", c)
		}
	}
}

func TestNewCronJobsResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedCronJobInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newCronJob(ns, "cj"))
	}
	objs = append(objs, newCronJob("ns-other", "cj"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewCronJobsResource(cs, func() cache.SharedIndexInformer { return factory.Batch().V1().CronJobs().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing cronjobs: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d cronjobs, got %d", len(namespaces)+1, len(all))
	}
}
