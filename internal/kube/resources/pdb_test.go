package kubeResources

import (
	"testing"

	policyv1 "k8s.io/api/policy/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	listerspolicyv1 "k8s.io/client-go/listers/policy/v1"
	"k8s.io/client-go/tools/cache"
)

func newPDBLister(pdbs ...*policyv1.PodDisruptionBudget) listerspolicyv1.PodDisruptionBudgetLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, pdb := range pdbs {
		_ = indexer.Add(pdb)
	}
	return listerspolicyv1.NewPodDisruptionBudgetLister(indexer)
}

func makePDB(name, namespace string) *policyv1.PodDisruptionBudget {
	return &policyv1.PodDisruptionBudget{
		ObjectMeta: v1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: v1.Time{Time: fixedTime},
		},
	}
}

func TestListPodDisruptionBudgets_SingleNamespace(t *testing.T) {
	pdb := makePDB("test-pdb", "default")
	lister := newPDBLister(pdb)

	result, err := ListPodDisruptionBudgets(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "test-pdb" {
		t.Errorf("Name = %q; want %q", result[0].Name, "test-pdb")
	}
}

func TestListPodDisruptionBudgets_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	pdb1 := makePDB("pdb-a", "ns-a")
	pdb2 := makePDB("pdb-b", "ns-b")
	lister := newPDBLister(pdb1, pdb2)

	result, err := ListPodDisruptionBudgets(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListPodDisruptionBudgets_SpecificNamespaceFilters(t *testing.T) {
	pdb1 := makePDB("pdb-a", "ns-a")
	pdb2 := makePDB("pdb-b", "ns-b")
	lister := newPDBLister(pdb1, pdb2)

	result, err := ListPodDisruptionBudgets(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "pdb-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "pdb-a")
	}
}

func TestListPodDisruptionBudgets_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newPDBLister()

	result, err := ListPodDisruptionBudgets(lister, nil)
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

func TestToPodDisruptionBudget_NilMinAvailable_IsDash(t *testing.T) {
	pdb := makePDB("pdb", "default")
	pdb.Spec.MinAvailable = nil

	got := toPodDisruptionBudget(pdb)
	if got.MinAvailable != "-" {
		t.Errorf("MinAvailable = %q; want %q", got.MinAvailable, "-")
	}
}

func TestToPodDisruptionBudget_WithMinAvailable(t *testing.T) {
	pdb := makePDB("pdb", "default")
	minAvail := intstr.FromInt(3)
	pdb.Spec.MinAvailable = &minAvail

	got := toPodDisruptionBudget(pdb)
	if got.MinAvailable != "3" {
		t.Errorf("MinAvailable = %q; want %q", got.MinAvailable, "3")
	}
}

func TestToPodDisruptionBudget_NilMaxUnavailable_IsDash(t *testing.T) {
	pdb := makePDB("pdb", "default")
	pdb.Spec.MaxUnavailable = nil

	got := toPodDisruptionBudget(pdb)
	if got.MaxUnavailable != "-" {
		t.Errorf("MaxUnavailable = %q; want %q", got.MaxUnavailable, "-")
	}
}

func TestToPodDisruptionBudget_WithMaxUnavailable(t *testing.T) {
	pdb := makePDB("pdb", "default")
	maxUnavail := intstr.FromInt(2)
	pdb.Spec.MaxUnavailable = &maxUnavail

	got := toPodDisruptionBudget(pdb)
	if got.MaxUnavailable != "2" {
		t.Errorf("MaxUnavailable = %q; want %q", got.MaxUnavailable, "2")
	}
}

func TestGetPodDisruptionBudgetByName_Success(t *testing.T) {
	pdb := makePDB("test-pdb", "default")
	pdb.Labels = map[string]string{"app": "test"}
	pdb.Annotations = map[string]string{"desc": "test"}
	pdb.Status.CurrentHealthy = 5
	pdb.Status.DesiredHealthy = 5
	lister := newPDBLister(pdb)

	result, err := GetPodDisruptionBudgetByName(lister, "default", "test-pdb")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.Name != "test-pdb" {
		t.Errorf("Name = %q; want %q", result.Name, "test-pdb")
	}
	if result.CurrentHealthy != 5 {
		t.Errorf("CurrentHealthy = %d; want 5", result.CurrentHealthy)
	}
}

func TestGetPodDisruptionBudgetByName_NotFound(t *testing.T) {
	pdb := makePDB("test-pdb", "default")
	lister := newPDBLister(pdb)

	_, err := GetPodDisruptionBudgetByName(lister, "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent PDB; got nil")
	}
}

func TestGetPodDisruptionBudgetByName_NilSelector_EmptySelector(t *testing.T) {
	pdb := makePDB("test-pdb", "default")
	pdb.Spec.Selector = nil
	lister := newPDBLister(pdb)

	result, err := GetPodDisruptionBudgetByName(lister, "default", "test-pdb")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Selector) != 0 {
		t.Errorf("Selector length = %d; want 0", len(result.Selector))
	}
}

func TestGetPodDisruptionBudgetByName_WithSelector(t *testing.T) {
	pdb := makePDB("test-pdb", "default")
	pdb.Spec.Selector = &v1.LabelSelector{
		MatchLabels: map[string]string{"app": "test"},
	}
	lister := newPDBLister(pdb)

	result, err := GetPodDisruptionBudgetByName(lister, "default", "test-pdb")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Selector) != 1 {
		t.Errorf("Selector length = %d; want 1", len(result.Selector))
	}
	if result.Selector["app"] != "test" {
		t.Errorf("Selector[app] = %q; want %q", result.Selector["app"], "test")
	}
}
