package kubeResources

import (
	"errors"
	"testing"

	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersnetworkingv1 "k8s.io/client-go/listers/networking/v1"
	"k8s.io/client-go/tools/cache"
)

type errorNetworkPolicyLister struct{ err error }

func (e *errorNetworkPolicyLister) List(_ labels.Selector) ([]*networkingv1.NetworkPolicy, error) {
	return nil, e.err
}
func (e *errorNetworkPolicyLister) NetworkPolicies(_ string) listersnetworkingv1.NetworkPolicyNamespaceLister {
	return &errorNetworkPolicyNamespaceLister{e.err}
}

type errorNetworkPolicyNamespaceLister struct{ err error }

func (e *errorNetworkPolicyNamespaceLister) List(_ labels.Selector) ([]*networkingv1.NetworkPolicy, error) {
	return nil, e.err
}
func (e *errorNetworkPolicyNamespaceLister) Get(_ string) (*networkingv1.NetworkPolicy, error) {
	return nil, e.err
}

func newNetworkPolicyLister(nps ...*networkingv1.NetworkPolicy) listersnetworkingv1.NetworkPolicyLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, np := range nps {
		_ = indexer.Add(np)
	}
	return listersnetworkingv1.NewNetworkPolicyLister(indexer)
}

func makeNetworkPolicy(name, namespace string) *networkingv1.NetworkPolicy {
	return &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
}

func TestListNetworkPolicies_SingleNamespace(t *testing.T) {
	np := makeNetworkPolicy("test-np", "default")
	lister := newNetworkPolicyLister(np)

	result, err := ListNetworkPolicies(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "test-np" {
		t.Errorf("Name = %q; want %q", result[0].Name, "test-np")
	}
}

func TestListNetworkPolicies_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	np1 := makeNetworkPolicy("np-a", "ns-a")
	np2 := makeNetworkPolicy("np-b", "ns-b")
	lister := newNetworkPolicyLister(np1, np2)

	result, err := ListNetworkPolicies(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListNetworkPolicies_SpecificNamespaceFilters(t *testing.T) {
	np1 := makeNetworkPolicy("np-a", "ns-a")
	np2 := makeNetworkPolicy("np-b", "ns-b")
	lister := newNetworkPolicyLister(np1, np2)

	result, err := ListNetworkPolicies(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "np-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "np-a")
	}
}

func TestListNetworkPolicies_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newNetworkPolicyLister()

	result, err := ListNetworkPolicies(lister, nil)
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

func TestListNetworkPolicies_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListNetworkPolicies(&errorNetworkPolicyLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListNetworkPolicies_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListNetworkPolicies(&errorNetworkPolicyLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestToNetworkPolicy_EmptyPolicyTypes_IsDash(t *testing.T) {
	np := makeNetworkPolicy("np", "default")
	np.Spec.PolicyTypes = []networkingv1.PolicyType{}

	got := toNetworkPolicy(np)
	if got.PolicyTypes != "-" {
		t.Errorf("PolicyTypes = %q; want %q", got.PolicyTypes, "-")
	}
}

func TestToNetworkPolicy_SinglePolicyType(t *testing.T) {
	np := makeNetworkPolicy("np", "default")
	np.Spec.PolicyTypes = []networkingv1.PolicyType{networkingv1.PolicyTypeIngress}

	got := toNetworkPolicy(np)
	if got.PolicyTypes != "Ingress" {
		t.Errorf("PolicyTypes = %q; want %q", got.PolicyTypes, "Ingress")
	}
}

func TestToNetworkPolicy_MultiplePolicyTypes(t *testing.T) {
	np := makeNetworkPolicy("np", "default")
	np.Spec.PolicyTypes = []networkingv1.PolicyType{
		networkingv1.PolicyTypeIngress,
		networkingv1.PolicyTypeEgress,
	}

	got := toNetworkPolicy(np)
	if got.PolicyTypes != "Ingress, Egress" {
		t.Errorf("PolicyTypes = %q; want %q", got.PolicyTypes, "Ingress, Egress")
	}
}

func TestGetNetworkPolicyByName_Success(t *testing.T) {
	np := makeNetworkPolicy("test-np", "default")
	np.Labels = map[string]string{"app": "test"}
	np.Annotations = map[string]string{"desc": "test policy"}
	lister := newNetworkPolicyLister(np)

	result, err := GetNetworkPolicyByName(lister, "default", "test-np")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.Name != "test-np" {
		t.Errorf("Name = %q; want %q", result.Name, "test-np")
	}
	if result.Namespace != "default" {
		t.Errorf("Namespace = %q; want %q", result.Namespace, "default")
	}
}

func TestGetNetworkPolicyByName_NotFound(t *testing.T) {
	np := makeNetworkPolicy("test-np", "default")
	lister := newNetworkPolicyLister(np)

	_, err := GetNetworkPolicyByName(lister, "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent policy; got nil")
	}
}

func TestGetNetworkPolicyByName_EmptyPodSelector(t *testing.T) {
	np := makeNetworkPolicy("test-np", "default")
	np.Spec.PodSelector = metav1.LabelSelector{}
	lister := newNetworkPolicyLister(np)

	result, err := GetNetworkPolicyByName(lister, "default", "test-np")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PodSelector == nil {
		t.Error("PodSelector should not be nil")
	}
	if len(result.PodSelector) != 0 {
		t.Errorf("PodSelector length = %d; want 0", len(result.PodSelector))
	}
}

func TestGetNetworkPolicyByName_WithIngressRules(t *testing.T) {
	np := makeNetworkPolicy("test-np", "default")
	np.Spec.Ingress = []networkingv1.NetworkPolicyIngressRule{
		{
			Ports: []networkingv1.NetworkPolicyPort{},
		},
	}
	lister := newNetworkPolicyLister(np)

	result, err := GetNetworkPolicyByName(lister, "default", "test-np")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.IngressRules) != 1 {
		t.Fatalf("expected 1 ingress rule; got %d", len(result.IngressRules))
	}
}

func TestGetNetworkPolicyByName_WithEgressRules(t *testing.T) {
	np := makeNetworkPolicy("test-np", "default")
	np.Spec.Egress = []networkingv1.NetworkPolicyEgressRule{
		{
			Ports: []networkingv1.NetworkPolicyPort{},
		},
	}
	lister := newNetworkPolicyLister(np)

	result, err := GetNetworkPolicyByName(lister, "default", "test-np")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.EgressRules) != 1 {
		t.Fatalf("expected 1 egress rule; got %d", len(result.EgressRules))
	}
}

func TestMapEgressRule_EmptyPorts_EmptySlice(t *testing.T) {
	rule := networkingv1.NetworkPolicyEgressRule{
		Ports: []networkingv1.NetworkPolicyPort{},
	}

	result := mapEgressRule(rule)
	if len(result.Ports) != 0 {
		t.Errorf("expected 0 ports; got %d", len(result.Ports))
	}
}

func TestMapNetworkPolicyPeer_NilPodSelector_EmptyMap(t *testing.T) {
	peer := networkingv1.NetworkPolicyPeer{
		PodSelector: nil,
	}

	result := mapNetworkPolicyPeer(peer)
	if len(result.PodSelector) != 0 {
		t.Errorf("PodSelector length = %d; want 0", len(result.PodSelector))
	}
}

func TestMapNetworkPolicyPeer_NilNamespaceSelector_EmptyMap(t *testing.T) {
	peer := networkingv1.NetworkPolicyPeer{
		NamespaceSelector: nil,
	}

	result := mapNetworkPolicyPeer(peer)
	if len(result.NamespaceSelector) != 0 {
		t.Errorf("NamespaceSelector length = %d; want 0", len(result.NamespaceSelector))
	}
}

func TestMapNetworkPolicyPeer_WithIPBlock(t *testing.T) {
	peer := networkingv1.NetworkPolicyPeer{
		IPBlock: &networkingv1.IPBlock{
			CIDR: "192.168.0.0/16",
		},
	}

	result := mapNetworkPolicyPeer(peer)
	if result.IPBlock != "192.168.0.0/16" {
		t.Errorf("IPBlock = %q; want %q", result.IPBlock, "192.168.0.0/16")
	}
}

func TestMapNetworkPolicyPeer_NilIPBlock_EmptyString(t *testing.T) {
	peer := networkingv1.NetworkPolicyPeer{}

	result := mapNetworkPolicyPeer(peer)
	if result.IPBlock != "" {
		t.Errorf("IPBlock = %q; want empty string", result.IPBlock)
	}
}
