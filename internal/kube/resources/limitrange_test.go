package kubeResources

import (
	"errors"
	"strings"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	"k8s.io/client-go/tools/cache"
)

// errorLimitRangeLister always returns a fixed error from List / namespaced List.
type errorLimitRangeLister struct{ err error }

func (e *errorLimitRangeLister) List(_ labels.Selector) ([]*corev1.LimitRange, error) {
	return nil, e.err
}
func (e *errorLimitRangeLister) LimitRanges(_ string) listerscorev1.LimitRangeNamespaceLister {
	return &errorLimitRangeNamespaceLister{e.err}
}

type errorLimitRangeNamespaceLister struct{ err error }

func (e *errorLimitRangeNamespaceLister) List(_ labels.Selector) ([]*corev1.LimitRange, error) {
	return nil, e.err
}
func (e *errorLimitRangeNamespaceLister) Get(_ string) (*corev1.LimitRange, error) {
	return nil, e.err
}

func newLimitRangeLister(lrs ...*corev1.LimitRange) listerscorev1.LimitRangeLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, lr := range lrs {
		_ = indexer.Add(lr)
	}
	return listerscorev1.NewLimitRangeLister(indexer)
}

// fixedTime is a stable past timestamp used by all helpers to avoid wall-clock flakiness.
var fixedTime = time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)

func makeLimitRange(name, namespace string) *corev1.LimitRange {
	return &corev1.LimitRange{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
}

func TestListLimitRanges_NameNamespace(t *testing.T) {
	lr := makeLimitRange("my-limitrange", "production")
	lister := newLimitRangeLister(lr)

	result, err := ListLimitRanges(lister, []string{"production"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-limitrange" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-limitrange")
	}
	if result[0].Namespace != "production" {
		t.Errorf("Namespace = %q; want %q", result[0].Namespace, "production")
	}
}

func TestListLimitRanges_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	lr1 := makeLimitRange("lr-a", "ns-a")
	lr2 := makeLimitRange("lr-b", "ns-b")
	lister := newLimitRangeLister(lr1, lr2)

	result, err := ListLimitRanges(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListLimitRanges_SpecificNamespaceFilters(t *testing.T) {
	lr1 := makeLimitRange("lr-a", "ns-a")
	lr2 := makeLimitRange("lr-b", "ns-b")
	lister := newLimitRangeLister(lr1, lr2)

	result, err := ListLimitRanges(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "lr-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "lr-a")
	}
}

func TestListLimitRanges_Age_NonZeroTimestamp_IsNonEmpty(t *testing.T) {
	lr := makeLimitRange("lr", "default")
	lister := newLimitRangeLister(lr)

	result, err := ListLimitRanges(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	age := result[0].Age
	if age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
	if !strings.HasSuffix(age, "d") {
		t.Errorf("Age = %q; want suffix \"d\" for a years-old resource", age)
	}
}

func TestListLimitRanges_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newLimitRangeLister()

	result, err := ListLimitRanges(lister, nil)
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

func TestListLimitRanges_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListLimitRanges(&errorLimitRangeLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListLimitRanges_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListLimitRanges(&errorLimitRangeLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

// Zero-value CreationTimestamp (epoch): toLimitRange must still return a non-empty Age.
func TestToLimitRange_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	lr := &corev1.LimitRange{
		ObjectMeta: metav1.ObjectMeta{Name: "lr", Namespace: "default"},
	}
	got := toLimitRange(lr)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
	if !strings.HasSuffix(got.Age, "d") {
		t.Errorf("Age = %q; want suffix \"d\" for epoch-age resource", got.Age)
	}
}
