package nsscope

import (
	"fmt"
	"testing"

	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newNetworkPolicy(namespace, name string) *networkingv1.NetworkPolicy {
	return &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewNetworkPoliciesResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newNetworkPolicy("ns-a", "a1"), newNetworkPolicy("ns-a", "a2"),
		newNetworkPolicy("ns-b", "b1"),
		newNetworkPolicy("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewNetworkPoliciesResource(cs, func() cache.SharedIndexInformer { return factory.Networking().V1().NetworkPolicies().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing networkpolicies: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 networkpolicies across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no networkpolicies from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewNetworkPoliciesResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedNetworkPolicyInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newNetworkPolicy(ns, "np"))
	}
	objs = append(objs, newNetworkPolicy("ns-other", "np"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewNetworkPoliciesResource(cs, func() cache.SharedIndexInformer { return factory.Networking().V1().NetworkPolicies().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing networkpolicies: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d networkpolicies, got %d", len(namespaces)+1, len(all))
	}
}
