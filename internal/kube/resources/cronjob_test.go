package kubeResources

import (
	"errors"
	"testing"

	batchv1 "k8s.io/api/batch/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersbatchv1 "k8s.io/client-go/listers/batch/v1"
	"k8s.io/client-go/tools/cache"
)

type errorCronJobLister struct{ err error }

func (e *errorCronJobLister) List(_ labels.Selector) ([]*batchv1.CronJob, error) {
	return nil, e.err
}
func (e *errorCronJobLister) CronJobs(_ string) listersbatchv1.CronJobNamespaceLister {
	return &errorCronJobNamespaceLister{e.err}
}

type errorCronJobNamespaceLister struct{ err error }

func (e *errorCronJobNamespaceLister) List(_ labels.Selector) ([]*batchv1.CronJob, error) {
	return nil, e.err
}
func (e *errorCronJobNamespaceLister) Get(_ string) (*batchv1.CronJob, error) {
	return nil, e.err
}

func newCronJobLister(cjs ...*batchv1.CronJob) listersbatchv1.CronJobLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, cj := range cjs {
		_ = indexer.Add(cj)
	}
	return listersbatchv1.NewCronJobLister(indexer)
}

func makeCronJob(name, namespace string) *batchv1.CronJob {
	return &batchv1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: batchv1.CronJobSpec{
			Schedule: "0 0 * * *",
		},
	}
}

func TestListCronJobs_SingleNamespace(t *testing.T) {
	cj := makeCronJob("my-cronjob", "production")
	lister := newCronJobLister(cj)

	result, err := ListCronJobs(lister, []string{"production"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-cronjob" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-cronjob")
	}
}

func TestListCronJobs_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	cj1 := makeCronJob("cj-a", "ns-a")
	cj2 := makeCronJob("cj-b", "ns-b")
	lister := newCronJobLister(cj1, cj2)

	result, err := ListCronJobs(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListCronJobs_SpecificNamespaceFilters(t *testing.T) {
	cj1 := makeCronJob("cj-a", "ns-a")
	cj2 := makeCronJob("cj-b", "ns-b")
	lister := newCronJobLister(cj1, cj2)

	result, err := ListCronJobs(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "cj-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "cj-a")
	}
}

func TestListCronJobs_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newCronJobLister()

	result, err := ListCronJobs(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Error("expected non-nil slice; got nil")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result; got %d items", len(result))
	}
}

func TestListCronJobs_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListCronJobs(&errorCronJobLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListCronJobs_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListCronJobs(&errorCronJobLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestGetCronJobByName_Found(t *testing.T) {
	cj := makeCronJob("my-cronjob", "production")
	lister := newCronJobLister(cj)

	result, err := GetCronJobByName(lister, "production", "my-cronjob")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-cronjob" {
		t.Errorf("Name = %q; want %q", result.Name, "my-cronjob")
	}
}

func TestGetCronJobByName_Age_NonZeroTimestamp(t *testing.T) {
	cj := makeCronJob("my-cronjob", "default")
	lister := newCronJobLister(cj)

	result, err := GetCronJobByName(lister, "default", "my-cronjob")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToCronJob_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	cj := &batchv1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "cronjob",
			Namespace: "default",
		},
		Spec: batchv1.CronJobSpec{
			Schedule: "0 0 * * *",
		},
	}
	got := toCronJob(cj)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}

func TestToCronJob_Schedule(t *testing.T) {
	cj := &batchv1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-cj",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: batchv1.CronJobSpec{
			Schedule: "*/5 * * * *",
		},
	}
	got := toCronJob(cj)
	if got.Schedule != "*/5 * * * *" {
		t.Errorf("Schedule = %q; want %q", got.Schedule, "*/5 * * * *")
	}
}
