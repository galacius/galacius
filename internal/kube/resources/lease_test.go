package kubeResources

import (
	"errors"
	"strings"
	"testing"
	"time"

	coordinationv1 "k8s.io/api/coordination/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscoordinationv1 "k8s.io/client-go/listers/coordination/v1"
	"k8s.io/client-go/tools/cache"
)

func ptr[T any](v T) *T { return &v }

type errorLeaseLister struct{ err error }

func (e *errorLeaseLister) List(_ labels.Selector) ([]*coordinationv1.Lease, error) {
	return nil, e.err
}
func (e *errorLeaseLister) Leases(_ string) listerscoordinationv1.LeaseNamespaceLister {
	return &errorLeaseNamespaceLister{e.err}
}

type errorLeaseNamespaceLister struct{ err error }

func (e *errorLeaseNamespaceLister) List(_ labels.Selector) ([]*coordinationv1.Lease, error) {
	return nil, e.err
}
func (e *errorLeaseNamespaceLister) Get(_ string) (*coordinationv1.Lease, error) {
	return nil, e.err
}

func newLeaseLister(leases ...*coordinationv1.Lease) listerscoordinationv1.LeaseLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, l := range leases {
		_ = indexer.Add(l)
	}
	return listerscoordinationv1.NewLeaseLister(indexer)
}

func makeLease(name, namespace string) *coordinationv1.Lease {
	return &coordinationv1.Lease{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
}

func TestListLeases_NameNamespace(t *testing.T) {
	l := makeLease("my-lease", "kube-system")
	lister := newLeaseLister(l)

	result, err := ListLeases(lister, []string{"kube-system"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-lease" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-lease")
	}
	if result[0].Namespace != "kube-system" {
		t.Errorf("Namespace = %q; want %q", result[0].Namespace, "kube-system")
	}
}

func TestListLeases_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	l1 := makeLease("lease-a", "ns-a")
	l2 := makeLease("lease-b", "ns-b")
	lister := newLeaseLister(l1, l2)

	result, err := ListLeases(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListLeases_SpecificNamespaceFilters(t *testing.T) {
	l1 := makeLease("lease-a", "ns-a")
	l2 := makeLease("lease-b", "ns-b")
	lister := newLeaseLister(l1, l2)

	result, err := ListLeases(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "lease-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "lease-a")
	}
}

func TestListLeases_Age_NonZeroTimestamp_IsNonEmpty(t *testing.T) {
	l := makeLease("lease", "default")
	lister := newLeaseLister(l)

	result, err := ListLeases(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
	if !strings.HasSuffix(result[0].Age, "d") {
		t.Errorf("Age = %q; want suffix \"d\" for a years-old resource", result[0].Age)
	}
}

func TestListLeases_EmptyLister_ReturnsNonNilEmptySlice(t *testing.T) {
	result, err := ListLeases(newLeaseLister(), nil)
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

func TestListLeases_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListLeases(&errorLeaseLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListLeases_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListLeases(&errorLeaseLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestListLeases_WrongNamespace_ReturnsEmpty(t *testing.T) {
	l := makeLease("lease-a", "ns-a")
	result, err := ListLeases(newLeaseLister(l), []string{"ns-b"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected 0 results for wrong namespace; got %d", len(result))
	}
}

func TestListLeases_LargeSet_SortedByName(t *testing.T) {
	names := []string{"echo", "charlie", "alpha", "delta", "bravo"}
	var leases []*coordinationv1.Lease
	for _, n := range names {
		leases = append(leases, makeLease(n, "default"))
	}
	result, err := ListLeases(newLeaseLister(leases...), []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 5 {
		t.Fatalf("expected 5 results, got %d", len(result))
	}
	want := []string{"alpha", "bravo", "charlie", "delta", "echo"}
	for i, w := range want {
		if result[i].Name != w {
			t.Errorf("result[%d].Name = %q; want %q", i, result[i].Name, w)
		}
	}
}

func TestToLease_NilPointerFields_ZeroValues(t *testing.T) {
	l := &coordinationv1.Lease{
		ObjectMeta: metav1.ObjectMeta{Name: "l", Namespace: "default"},
	}
	got := toLease(l)
	if got.HolderIdentity != "" {
		t.Errorf("HolderIdentity = %q; want empty", got.HolderIdentity)
	}
	if got.LeaseDurationSeconds != 0 {
		t.Errorf("LeaseDurationSeconds = %d; want 0", got.LeaseDurationSeconds)
	}
	if got.LeaseTransitions != 0 {
		t.Errorf("LeaseTransitions = %d; want 0", got.LeaseTransitions)
	}
	if got.RenewTime != "" {
		t.Errorf("RenewTime = %q; want empty", got.RenewTime)
	}
	if got.AcquireTime != "" {
		t.Errorf("AcquireTime = %q; want empty", got.AcquireTime)
	}
}

func TestToLease_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	l := &coordinationv1.Lease{
		ObjectMeta: metav1.ObjectMeta{Name: "l", Namespace: "default"},
	}
	got := toLease(l)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
	if !strings.HasSuffix(got.Age, "d") {
		t.Errorf("Age = %q; want suffix \"d\" for epoch-age resource", got.Age)
	}
}

func TestToLease_NilLabelsAnnotations_NoPanic(t *testing.T) {
	l := &coordinationv1.Lease{
		ObjectMeta: metav1.ObjectMeta{Name: "l", Namespace: "default"},
	}
	got := toLease(l)
	if got.Labels != nil {
		t.Errorf("Labels = %v; want nil", got.Labels)
	}
	if got.Annotations != nil {
		t.Errorf("Annotations = %v; want nil", got.Annotations)
	}
}

func TestToLease_RenewTimeAcquireTime_RFC3339Format(t *testing.T) {
	ts := metav1.MicroTime{Time: time.Date(2024, 6, 1, 12, 0, 0, 0, time.UTC)}
	l := &coordinationv1.Lease{
		ObjectMeta: metav1.ObjectMeta{Name: "l", Namespace: "default"},
		Spec: coordinationv1.LeaseSpec{
			RenewTime:   &ts,
			AcquireTime: &ts,
		},
	}
	got := toLease(l)
	want := "2024-06-01T12:00:00Z"
	if got.RenewTime != want {
		t.Errorf("RenewTime = %q; want %q", got.RenewTime, want)
	}
	if got.AcquireTime != want {
		t.Errorf("AcquireTime = %q; want %q", got.AcquireTime, want)
	}
	if _, err := time.Parse(time.RFC3339, got.RenewTime); err != nil {
		t.Errorf("RenewTime %q is not valid RFC3339: %v", got.RenewTime, err)
	}
}

func TestToLease_ManagedFields_EmptyInput_ReturnsEmptySlice(t *testing.T) {
	l := &coordinationv1.Lease{
		ObjectMeta: metav1.ObjectMeta{Name: "l", Namespace: "default"},
	}
	got := toLease(l)
	if got.ManagedFields == nil {
		t.Error("ManagedFields must not be nil; want empty slice")
	}
	if len(got.ManagedFields) != 0 {
		t.Errorf("ManagedFields length = %d; want 0", len(got.ManagedFields))
	}
}

func TestToLease_PointerFieldsPopulated(t *testing.T) {
	ts := metav1.MicroTime{Time: fixedTime}
	l := &coordinationv1.Lease{
		ObjectMeta: metav1.ObjectMeta{Name: "l", Namespace: "default"},
		Spec: coordinationv1.LeaseSpec{
			HolderIdentity:       ptr("controller-manager"),
			LeaseDurationSeconds: ptr(int32(15)),
			LeaseTransitions:     ptr(int32(3)),
			RenewTime:            &ts,
			AcquireTime:          &ts,
		},
	}
	got := toLease(l)
	if got.HolderIdentity != "controller-manager" {
		t.Errorf("HolderIdentity = %q; want %q", got.HolderIdentity, "controller-manager")
	}
	if got.LeaseDurationSeconds != 15 {
		t.Errorf("LeaseDurationSeconds = %d; want 15", got.LeaseDurationSeconds)
	}
	if got.LeaseTransitions != 3 {
		t.Errorf("LeaseTransitions = %d; want 3", got.LeaseTransitions)
	}
	if got.RenewTime == "" {
		t.Error("RenewTime must not be empty when Spec.RenewTime is set")
	}
	if got.AcquireTime == "" {
		t.Error("AcquireTime must not be empty when Spec.AcquireTime is set")
	}
}
