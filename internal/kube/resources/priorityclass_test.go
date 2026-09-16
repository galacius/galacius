package kubeResources

import (
	"errors"
	"testing"

	schedulingv1 "k8s.io/api/scheduling/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersschedulingv1 "k8s.io/client-go/listers/scheduling/v1"
	"k8s.io/client-go/tools/cache"
)

type errorPriorityClassLister struct{ err error }

func (e *errorPriorityClassLister) List(_ labels.Selector) ([]*schedulingv1.PriorityClass, error) {
	return nil, e.err
}
func (e *errorPriorityClassLister) Get(_ string) (*schedulingv1.PriorityClass, error) {
	return nil, e.err
}

func newPriorityClassLister(pcs ...*schedulingv1.PriorityClass) listersschedulingv1.PriorityClassLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{})
	for _, pc := range pcs {
		_ = indexer.Add(pc)
	}
	return listersschedulingv1.NewPriorityClassLister(indexer)
}

func makePriorityClass(name string) *schedulingv1.PriorityClass {
	return &schedulingv1.PriorityClass{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Value: 1000,
	}
}

func TestListPriorityClasses_Single(t *testing.T) {
	pc := makePriorityClass("high-priority")
	lister := newPriorityClassLister(pc)

	result, err := ListPriorityClasses(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "high-priority" {
		t.Errorf("Name = %q; want %q", result[0].Name, "high-priority")
	}
}

func TestListPriorityClasses_Multiple_Sorted(t *testing.T) {
	pc1 := makePriorityClass("zebra")
	pc2 := makePriorityClass("alpha")
	pc3 := makePriorityClass("beta")
	lister := newPriorityClassLister(pc1, pc2, pc3)

	result, err := ListPriorityClasses(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 3 {
		t.Fatalf("expected 3 results, got %d", len(result))
	}
	if result[0].Name != "alpha" {
		t.Errorf("result[0].Name = %q; want %q", result[0].Name, "alpha")
	}
	if result[1].Name != "beta" {
		t.Errorf("result[1].Name = %q; want %q", result[1].Name, "beta")
	}
	if result[2].Name != "zebra" {
		t.Errorf("result[2].Name = %q; want %q", result[2].Name, "zebra")
	}
}

func TestListPriorityClasses_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newPriorityClassLister()

	result, err := ListPriorityClasses(lister)
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

func TestListPriorityClasses_ErrorPropagation(t *testing.T) {
	sentinel := errors.New("store unavailable")
	_, err := ListPriorityClasses(&errorPriorityClassLister{err: sentinel})
	if !errors.Is(err, sentinel) {
		t.Errorf("expected sentinel error; got %v", err)
	}
}

func TestToPriorityClass_NilPreemptionPolicy_EmptyString(t *testing.T) {
	pc := makePriorityClass("pc")
	pc.PreemptionPolicy = nil

	got := toPriorityClass(pc)
	if got.PreemptionPolicy != "" {
		t.Errorf("PreemptionPolicy = %q; want empty string", got.PreemptionPolicy)
	}
}

func TestToPriorityClass_GlobalDefault(t *testing.T) {
	pc := makePriorityClass("system-cluster-critical")
	pc.GlobalDefault = true

	got := toPriorityClass(pc)
	if !got.GlobalDefault {
		t.Errorf("GlobalDefault = %v; want true", got.GlobalDefault)
	}
}

func TestGetPriorityClassByName_Success(t *testing.T) {
	pc := makePriorityClass("high-priority")
	pc.Description = "High priority workloads"
	lister := newPriorityClassLister(pc)

	result, err := GetPriorityClassByName(lister, "high-priority")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "high-priority" {
		t.Errorf("Name = %q; want %q", result.Name, "high-priority")
	}
	if result.Description != "High priority workloads" {
		t.Errorf("Description = %q; want %q", result.Description, "High priority workloads")
	}
}

func TestGetPriorityClassByName_NotFound(t *testing.T) {
	pc := makePriorityClass("high-priority")
	lister := newPriorityClassLister(pc)

	_, err := GetPriorityClassByName(lister, "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent PriorityClass; got nil")
	}
}

func TestGetPriorityClassByName_WithValue(t *testing.T) {
	pc := makePriorityClass("system-critical")
	pc.Value = 2000000000
	lister := newPriorityClassLister(pc)

	result, err := GetPriorityClassByName(lister, "system-critical")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Value != 2000000000 {
		t.Errorf("Value = %d; want 2000000000", result.Value)
	}
}
