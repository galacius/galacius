package kubeResources

import (
	"errors"
	"testing"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	"k8s.io/client-go/tools/cache"
)

type errorResourceQuotaLister struct{ err error }

func (e *errorResourceQuotaLister) List(_ labels.Selector) ([]*corev1.ResourceQuota, error) {
	return nil, e.err
}
func (e *errorResourceQuotaLister) ResourceQuotas(_ string) listerscorev1.ResourceQuotaNamespaceLister {
	return &errorResourceQuotaNamespaceLister{e.err}
}

type errorResourceQuotaNamespaceLister struct{ err error }

func (e *errorResourceQuotaNamespaceLister) List(_ labels.Selector) ([]*corev1.ResourceQuota, error) {
	return nil, e.err
}
func (e *errorResourceQuotaNamespaceLister) Get(_ string) (*corev1.ResourceQuota, error) {
	return nil, e.err
}

func newResourceQuotaLister(rqs ...*corev1.ResourceQuota) listerscorev1.ResourceQuotaLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, rq := range rqs {
		_ = indexer.Add(rq)
	}
	return listerscorev1.NewResourceQuotaLister(indexer)
}

func makeResourceQuota(name, namespace string) *corev1.ResourceQuota {
	return &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
}

func TestListResourceQuotas_SingleNamespace(t *testing.T) {
	rq := makeResourceQuota("quota-1", "default")
	lister := newResourceQuotaLister(rq)

	result, err := ListResourceQuotas(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "quota-1" {
		t.Errorf("Name = %q; want %q", result[0].Name, "quota-1")
	}
}

func TestListResourceQuotas_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	rq1 := makeResourceQuota("quota-a", "ns-a")
	rq2 := makeResourceQuota("quota-b", "ns-b")
	lister := newResourceQuotaLister(rq1, rq2)

	result, err := ListResourceQuotas(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListResourceQuotas_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newResourceQuotaLister()

	result, err := ListResourceQuotas(lister, nil)
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

func TestListResourceQuotas_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListResourceQuotas(&errorResourceQuotaLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListResourceQuotas_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListResourceQuotas(&errorResourceQuotaLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestGetResourceQuotaByName_Success(t *testing.T) {
	rq := makeResourceQuota("quota-1", "default")
	rq.Spec.Hard = corev1.ResourceList{
		corev1.ResourceCPU:    resource.MustParse("10"),
		corev1.ResourceMemory: resource.MustParse("20Gi"),
	}
	rq.Status.Used = corev1.ResourceList{
		corev1.ResourceCPU:    resource.MustParse("5"),
		corev1.ResourceMemory: resource.MustParse("10Gi"),
	}
	lister := newResourceQuotaLister(rq)

	result, err := GetResourceQuotaByName(lister, "default", "quota-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "quota-1" {
		t.Errorf("Name = %q; want %q", result.Name, "quota-1")
	}
	if len(result.Hard) != 2 {
		t.Errorf("Hard length = %d; want 2", len(result.Hard))
	}
	if len(result.Used) != 2 {
		t.Errorf("Used length = %d; want 2", len(result.Used))
	}
}

func TestGetResourceQuotaByName_NotFound(t *testing.T) {
	rq := makeResourceQuota("quota-1", "default")
	lister := newResourceQuotaLister(rq)

	_, err := GetResourceQuotaByName(lister, "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent ResourceQuota; got nil")
	}
}

func TestGetResourceQuotaByName_EmptyHard_EmptyMap(t *testing.T) {
	rq := makeResourceQuota("quota-1", "default")
	rq.Spec.Hard = corev1.ResourceList{}
	lister := newResourceQuotaLister(rq)

	result, err := GetResourceQuotaByName(lister, "default", "quota-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Hard) != 0 {
		t.Errorf("Hard length = %d; want 0", len(result.Hard))
	}
}

func TestGetResourceQuotaByName_EmptyUsed_EmptyMap(t *testing.T) {
	rq := makeResourceQuota("quota-1", "default")
	rq.Status.Used = corev1.ResourceList{}
	lister := newResourceQuotaLister(rq)

	result, err := GetResourceQuotaByName(lister, "default", "quota-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Used) != 0 {
		t.Errorf("Used length = %d; want 0", len(result.Used))
	}
}

func TestToResourceQuota_Basic(t *testing.T) {
	rq := makeResourceQuota("quota", "default")

	got := toResourceQuota(rq)
	if got.Name != "quota" {
		t.Errorf("Name = %q; want %q", got.Name, "quota")
	}
	if got.Namespace != "default" {
		t.Errorf("Namespace = %q; want %q", got.Namespace, "default")
	}
}
