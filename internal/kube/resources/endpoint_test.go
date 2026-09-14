//lint:file-ignore SA1019 exercises the legacy Endpoints API, which toEndpoint/ListEndpoints still supports alongside EndpointSlice
package kubeResources

import (
	"errors"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	"k8s.io/client-go/tools/cache"
)

type errorEndpointLister struct{ err error }

func (e *errorEndpointLister) List(_ labels.Selector) ([]*corev1.Endpoints, error) {
	return nil, e.err
}
func (e *errorEndpointLister) Endpoints(_ string) listerscorev1.EndpointsNamespaceLister {
	return &errorEndpointNamespaceLister{e.err}
}

type errorEndpointNamespaceLister struct{ err error }

func (e *errorEndpointNamespaceLister) List(_ labels.Selector) ([]*corev1.Endpoints, error) {
	return nil, e.err
}
func (e *errorEndpointNamespaceLister) Get(_ string) (*corev1.Endpoints, error) {
	return nil, e.err
}

func newEndpointLister(eps ...*corev1.Endpoints) listerscorev1.EndpointsLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, ep := range eps {
		_ = indexer.Add(ep)
	}
	return listerscorev1.NewEndpointsLister(indexer)
}

func makeEndpoint(name, namespace string) *corev1.Endpoints {
	return &corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
}

func TestListEndpoints_SingleNamespace(t *testing.T) {
	ep := makeEndpoint("my-endpoints", "production")
	lister := newEndpointLister(ep)

	result, err := ListEndpoints(lister, []string{"production"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-endpoints" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-endpoints")
	}
}

func TestListEndpoints_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	ep1 := makeEndpoint("ep-a", "ns-a")
	ep2 := makeEndpoint("ep-b", "ns-b")
	lister := newEndpointLister(ep1, ep2)

	result, err := ListEndpoints(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListEndpoints_SpecificNamespaceFilters(t *testing.T) {
	ep1 := makeEndpoint("ep-a", "ns-a")
	ep2 := makeEndpoint("ep-b", "ns-b")
	lister := newEndpointLister(ep1, ep2)

	result, err := ListEndpoints(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "ep-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "ep-a")
	}
}

func TestListEndpoints_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newEndpointLister()

	result, err := ListEndpoints(lister, []string{"default"})
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

func TestListEndpoints_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListEndpoints(&errorEndpointLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListEndpoints_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListEndpoints(&errorEndpointLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestGetEndpointByName_Found(t *testing.T) {
	ep := makeEndpoint("my-endpoints", "production")
	lister := newEndpointLister(ep)

	result, err := GetEndpointByName(lister, "production", "my-endpoints")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-endpoints" {
		t.Errorf("Name = %q; want %q", result.Name, "my-endpoints")
	}
}

func TestGetEndpointByName_Age_NonZeroTimestamp(t *testing.T) {
	ep := makeEndpoint("my-endpoints", "default")
	lister := newEndpointLister(ep)

	result, err := GetEndpointByName(lister, "default", "my-endpoints")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToEndpoint_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	ep := &corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "endpoints",
			Namespace: "default",
		},
	}
	got := toEndpoint(ep)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}

func TestToEndpoint_WithAddresses(t *testing.T) {
	ep := &corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-ep",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Subsets: []corev1.EndpointSubset{
			{
				Addresses: []corev1.EndpointAddress{
					{IP: "10.0.0.1"},
					{IP: "10.0.0.2"},
				},
			},
		},
	}
	got := toEndpoint(ep)
	if len(got.Subsets) != 1 {
		t.Fatalf("expected 1 subset, got %d", len(got.Subsets))
	}
}

func TestToEndpoint_EmptySubsets(t *testing.T) {
	ep := &corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-ep",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
	got := toEndpoint(ep)
	if got.Subsets == nil {
		t.Error("Subsets must not be nil")
	}
	if len(got.Subsets) != 0 {
		t.Errorf("expected 0 subsets, got %d", len(got.Subsets))
	}
}
