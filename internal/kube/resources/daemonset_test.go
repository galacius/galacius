package kubeResources

import (
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	listersappsv1 "k8s.io/client-go/listers/apps/v1"
	"k8s.io/client-go/tools/cache"
)

func newDaemonSetLister(dss ...*appsv1.DaemonSet) listersappsv1.DaemonSetLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, ds := range dss {
		_ = indexer.Add(ds)
	}
	return listersappsv1.NewDaemonSetLister(indexer)
}

func makeDaemonSet(name, namespace string) *appsv1.DaemonSet {
	return &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: appsv1.DaemonSetSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "test"},
			},
		},
	}
}

func TestListDaemonSets_SingleNamespace(t *testing.T) {
	ds := makeDaemonSet("my-daemon", "production")
	lister := newDaemonSetLister(ds)

	result, err := ListDaemonSets(lister, []string{"production"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-daemon" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-daemon")
	}
}

func TestListDaemonSets_EmptyNamespaceReturnsEmpty(t *testing.T) {
	ds1 := makeDaemonSet("ds-a", "ns-a")
	ds2 := makeDaemonSet("ds-b", "ns-b")
	lister := newDaemonSetLister(ds1, ds2)

	result, err := ListDaemonSets(lister, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 results (cluster-wide list) for nil namespaces, got %d", len(result))
	}
}

func TestListDaemonSets_SpecificNamespaceFilters(t *testing.T) {
	ds1 := makeDaemonSet("ds-a", "ns-a")
	ds2 := makeDaemonSet("ds-b", "ns-b")
	lister := newDaemonSetLister(ds1, ds2)

	result, err := ListDaemonSets(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "ds-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "ds-a")
	}
}

func TestListDaemonSets_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newDaemonSetLister()

	result, err := ListDaemonSets(lister, []string{"default"})
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

func TestGetDaemonSetByName_Found(t *testing.T) {
	ds := makeDaemonSet("my-daemon", "production")
	lister := newDaemonSetLister(ds)

	result, err := GetDaemonSetByName(lister, "production", "my-daemon")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-daemon" {
		t.Errorf("Name = %q; want %q", result.Name, "my-daemon")
	}
}

func TestGetDaemonSetByName_Age_NonZeroTimestamp(t *testing.T) {
	ds := makeDaemonSet("my-daemon", "default")
	lister := newDaemonSetLister(ds)

	result, err := GetDaemonSetByName(lister, "default", "my-daemon")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToDaemonSet_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	ds := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "daemon",
			Namespace: "default",
		},
	}
	got := toDaemonSet(ds)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}

func TestToDaemonSet_WithSelector(t *testing.T) {
	ds := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-ds",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: appsv1.DaemonSetSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app":  "test",
					"tier": "frontend",
				},
			},
		},
	}
	got := toDaemonSet(ds)
	if len(got.Selector) == 0 {
		t.Error("Selector should not be empty")
	}
}

func TestToDaemonSet_NoSelector(t *testing.T) {
	ds := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-ds",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
	got := toDaemonSet(ds)
	if len(got.Selector) != 0 {
		t.Errorf("Selector = %v; want empty map", got.Selector)
	}
}
