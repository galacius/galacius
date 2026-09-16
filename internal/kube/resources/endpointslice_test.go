package kubeResources

import (
	"errors"
	"testing"

	discoveryv1 "k8s.io/api/discovery/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	discoveryv1listers "k8s.io/client-go/listers/discovery/v1"
	"k8s.io/client-go/tools/cache"
)

type errorEndpointSliceLister struct{ err error }

func (e *errorEndpointSliceLister) List(_ labels.Selector) ([]*discoveryv1.EndpointSlice, error) {
	return nil, e.err
}
func (e *errorEndpointSliceLister) EndpointSlices(_ string) discoveryv1listers.EndpointSliceNamespaceLister {
	return &errorEndpointSliceNamespaceLister{e.err}
}

type errorEndpointSliceNamespaceLister struct{ err error }

func (e *errorEndpointSliceNamespaceLister) List(_ labels.Selector) ([]*discoveryv1.EndpointSlice, error) {
	return nil, e.err
}
func (e *errorEndpointSliceNamespaceLister) Get(_ string) (*discoveryv1.EndpointSlice, error) {
	return nil, e.err
}

func newEndpointSliceLister(ess ...*discoveryv1.EndpointSlice) discoveryv1listers.EndpointSliceLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, es := range ess {
		_ = indexer.Add(es)
	}
	return discoveryv1listers.NewEndpointSliceLister(indexer)
}

func makeEndpointSlice(name, namespace string) *discoveryv1.EndpointSlice {
	return &discoveryv1.EndpointSlice{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		AddressType: discoveryv1.AddressTypeIPv4,
	}
}

func TestListEndpointSlices_SingleNamespace(t *testing.T) {
	es := makeEndpointSlice("my-slice", "production")
	lister := newEndpointSliceLister(es)

	result, err := ListEndpointSlices(lister, []string{"production"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-slice" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-slice")
	}
}

func TestListEndpointSlices_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	es1 := makeEndpointSlice("es-a", "ns-a")
	es2 := makeEndpointSlice("es-b", "ns-b")
	lister := newEndpointSliceLister(es1, es2)

	result, err := ListEndpointSlices(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListEndpointSlices_SpecificNamespaceFilters(t *testing.T) {
	es1 := makeEndpointSlice("es-a", "ns-a")
	es2 := makeEndpointSlice("es-b", "ns-b")
	lister := newEndpointSliceLister(es1, es2)

	result, err := ListEndpointSlices(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "es-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "es-a")
	}
}

func TestListEndpointSlices_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newEndpointSliceLister()

	result, err := ListEndpointSlices(lister, []string{"default"})
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

func TestListEndpointSlices_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListEndpointSlices(&errorEndpointSliceLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListEndpointSlices_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListEndpointSlices(&errorEndpointSliceLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestGetEndpointSliceByName_Found(t *testing.T) {
	es := makeEndpointSlice("my-slice", "production")
	lister := newEndpointSliceLister(es)

	result, err := GetEndpointSliceByName(lister, "production", "my-slice")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-slice" {
		t.Errorf("Name = %q; want %q", result.Name, "my-slice")
	}
}

func TestGetEndpointSliceByName_Age_NonZeroTimestamp(t *testing.T) {
	es := makeEndpointSlice("my-slice", "default")
	lister := newEndpointSliceLister(es)

	result, err := GetEndpointSliceByName(lister, "default", "my-slice")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToEndpointSlice_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	es := &discoveryv1.EndpointSlice{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "slice",
			Namespace: "default",
		},
		AddressType: discoveryv1.AddressTypeIPv4,
	}
	got := toEndpointSlice(es)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}

func TestToEndpointSlice_WithEndpoints(t *testing.T) {
	es := &discoveryv1.EndpointSlice{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-slice",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		AddressType: discoveryv1.AddressTypeIPv4,
		Endpoints: []discoveryv1.Endpoint{
			{
				Addresses: []string{"10.0.0.1"},
			},
			{
				Addresses: []string{"10.0.0.2"},
			},
		},
	}
	got := toEndpointSlice(es)
	if len(got.Endpoints) != 2 {
		t.Fatalf("expected 2 endpoints, got %d", len(got.Endpoints))
	}
}

func TestToEndpointSlice_EmptyEndpoints(t *testing.T) {
	es := &discoveryv1.EndpointSlice{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-slice",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		AddressType: discoveryv1.AddressTypeIPv4,
	}
	got := toEndpointSlice(es)
	if got.Endpoints == nil {
		t.Error("Endpoints must not be nil")
	}
	if len(got.Endpoints) != 0 {
		t.Errorf("expected 0 endpoints, got %d", len(got.Endpoints))
	}
}
