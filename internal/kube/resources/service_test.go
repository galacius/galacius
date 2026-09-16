package kubeResources

import (
	"errors"
	"reflect"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	"k8s.io/client-go/tools/cache"
)

type errorServiceLister struct{ err error }

func (e *errorServiceLister) List(_ labels.Selector) ([]*corev1.Service, error) {
	return nil, e.err
}
func (e *errorServiceLister) Services(_ string) listerscorev1.ServiceNamespaceLister {
	return &errorServiceNamespaceLister{e.err}
}

type errorServiceNamespaceLister struct{ err error }

func (e *errorServiceNamespaceLister) List(_ labels.Selector) ([]*corev1.Service, error) {
	return nil, e.err
}
func (e *errorServiceNamespaceLister) Get(_ string) (*corev1.Service, error) {
	return nil, e.err
}

func newServiceLister(svcs ...*corev1.Service) listerscorev1.ServiceLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, svc := range svcs {
		_ = indexer.Add(svc)
	}
	return listerscorev1.NewServiceLister(indexer)
}

func makeService(name, namespace string) *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: corev1.ServiceSpec{
			Type: corev1.ServiceTypeClusterIP,
		},
	}
}

func TestListServices_SingleNamespace(t *testing.T) {
	svc := makeService("svc-1", "default")
	lister := newServiceLister(svc)

	result, err := ListServices(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "svc-1" {
		t.Errorf("Name = %q; want %q", result[0].Name, "svc-1")
	}
}

func TestListServices_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	svc1 := makeService("svc-a", "ns-a")
	svc2 := makeService("svc-b", "ns-b")
	lister := newServiceLister(svc1, svc2)

	result, err := ListServices(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListServices_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newServiceLister()

	result, err := ListServices(lister, nil)
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

func TestListServices_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListServices(&errorServiceLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListServices_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListServices(&errorServiceLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestToService_NoExternalIP_IsDash(t *testing.T) {
	svc := makeService("svc", "default")
	svc.Status.LoadBalancer.Ingress = []corev1.LoadBalancerIngress{}

	got := toService(svc)
	if got.ExternalIP != "-" {
		t.Errorf("ExternalIP = %q; want %q", got.ExternalIP, "-")
	}
}

func TestToService_WithExternalHostname(t *testing.T) {
	svc := makeService("svc", "default")
	svc.Status.LoadBalancer.Ingress = []corev1.LoadBalancerIngress{
		{Hostname: "example.com"},
	}

	got := toService(svc)
	if got.ExternalIP != "example.com" {
		t.Errorf("ExternalIP = %q; want %q", got.ExternalIP, "example.com")
	}
}

func TestToService_WithExternalIP(t *testing.T) {
	svc := makeService("svc", "default")
	svc.Status.LoadBalancer.Ingress = []corev1.LoadBalancerIngress{
		{IP: "1.2.3.4"},
	}

	got := toService(svc)
	if got.ExternalIP != "1.2.3.4" {
		t.Errorf("ExternalIP = %q; want %q", got.ExternalIP, "1.2.3.4")
	}
}

func TestToService_NoPorts_EmptyString(t *testing.T) {
	svc := makeService("svc", "default")
	svc.Spec.Ports = []corev1.ServicePort{}

	got := toService(svc)
	if got.Ports != "" {
		t.Errorf("Ports = %q; want empty", got.Ports)
	}
}

func TestToService_EmptySelector_IsEmptyMap(t *testing.T) {
	svc := makeService("svc", "default")
	svc.Spec.Selector = map[string]string{}

	got := toService(svc)
	if len(got.Selector) != 0 {
		t.Errorf("Selector = %v; want empty map", got.Selector)
	}
}

func TestToService_WithSelector(t *testing.T) {
	svc := makeService("svc", "default")
	svc.Spec.Selector = map[string]string{"app": "nginx"}

	got := toService(svc)
	want := map[string]string{"app": "nginx"}
	if !reflect.DeepEqual(got.Selector, want) {
		t.Errorf("Selector = %v; want %v", got.Selector, want)
	}
}

func TestToService_Terminating_StatusTerminating(t *testing.T) {
	svc := makeService("svc", "default")
	now := metav1.Now()
	svc.DeletionTimestamp = &now

	got := toService(svc)
	if got.Status != "Terminating" {
		t.Errorf("Status = %q; want %q", got.Status, "Terminating")
	}
}

func TestGetServiceByName_Success(t *testing.T) {
	svc := makeService("svc-1", "default")
	svc.Spec.ClusterIP = "10.0.0.1"
	lister := newServiceLister(svc)

	result, err := GetServiceByName(lister, "default", "svc-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "svc-1" {
		t.Errorf("Name = %q; want %q", result.Name, "svc-1")
	}
	if result.ClusterIP != "10.0.0.1" {
		t.Errorf("ClusterIP = %q; want %q", result.ClusterIP, "10.0.0.1")
	}
}

func TestGetServiceByName_NotFound(t *testing.T) {
	svc := makeService("svc-1", "default")
	lister := newServiceLister(svc)

	_, err := GetServiceByName(lister, "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent Service; got nil")
	}
}

func TestToService_WithIPFamilyPolicy(t *testing.T) {
	svc := makeService("svc", "default")
	policy := corev1.IPFamilyPolicySingleStack
	svc.Spec.IPFamilyPolicy = &policy

	got := toService(svc)
	if got.IPFamilyPolicy != string(corev1.IPFamilyPolicySingleStack) {
		t.Errorf("IPFamilyPolicy = %q; want %q", got.IPFamilyPolicy, string(corev1.IPFamilyPolicySingleStack))
	}
}

func TestToService_NilSessionAffinity_DefaultsToNone(t *testing.T) {
	svc := makeService("svc", "default")
	svc.Spec.SessionAffinity = ""

	got := toService(svc)
	if got.SessionAffinity != "None" {
		t.Errorf("SessionAffinity = %q; want %q", got.SessionAffinity, "None")
	}
}
