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

func newIngress(namespace, name string) *networkingv1.Ingress {
	return &networkingv1.Ingress{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewIngressesResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newIngress("ns-a", "a1"), newIngress("ns-a", "a2"),
		newIngress("ns-b", "b1"),
		newIngress("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewIngressesResource(cs, func() cache.SharedIndexInformer { return factory.Networking().V1().Ingresses().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing ingresses: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 ingresses across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no ingresses from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewIngressesResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedIngressInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newIngress(ns, "ing"))
	}
	objs = append(objs, newIngress("ns-other", "ing"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewIngressesResource(cs, func() cache.SharedIndexInformer { return factory.Networking().V1().Ingresses().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing ingresses: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d ingresses, got %d", len(namespaces)+1, len(all))
	}
}
