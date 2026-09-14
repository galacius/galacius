package nsscope

import (
	"fmt"
	"testing"

	coordinationv1 "k8s.io/api/coordination/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newLease(namespace, name string) *coordinationv1.Lease {
	return &coordinationv1.Lease{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewLeasesResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newLease("ns-a", "a1"), newLease("ns-a", "a2"),
		newLease("ns-b", "b1"),
		newLease("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewLeasesResource(cs, func() cache.SharedIndexInformer { return factory.Coordination().V1().Leases().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing leases: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 leases across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no leases from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewLeasesResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedLeaseInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newLease(ns, "lease"))
	}
	objs = append(objs, newLease("ns-other", "lease"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewLeasesResource(cs, func() cache.SharedIndexInformer { return factory.Coordination().V1().Leases().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing leases: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d leases, got %d", len(namespaces)+1, len(all))
	}
}
