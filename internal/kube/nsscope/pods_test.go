package nsscope

import (
	"fmt"
	"testing"

	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

// These tests cover the Pods-specific glue in pods.go: that NewPodsResource
// correctly wires Pods into the generic engine tested white-box in
// scoped_resource_test.go.

// TestNewPodsResourceNamespaceScoped verifies that Rescope with a small
// namespace set builds per-namespace informers that only see pods in the
// selected namespaces, not the whole cluster.
func TestNewPodsResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newPod("ns-a", "a1"), newPod("ns-a", "a2"),
		newPod("ns-b", "b1"), newPod("ns-b", "b2"), newPod("ns-b", "b3"),
		newPod("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewPodsResource(cs, func() cache.SharedIndexInformer { return factory.Core().V1().Pods().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing pods: %v", err)
	}
	if len(all) != 5 {
		t.Fatalf("expected 5 pods across ns-a/ns-b, got %d", len(all))
	}
	for _, p := range all {
		if p.Namespace == "ns-c" {
			t.Fatalf("expected no pods from unselected namespace ns-c, got %v", p)
		}
	}

	nsA, err := r.Lister().Pods("ns-a").List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing ns-a pods: %v", err)
	}
	if len(nsA) != 2 {
		t.Fatalf("expected 2 pods in ns-a, got %d", len(nsA))
	}

	// A namespace outside the current scope should behave as empty, not panic.
	nsC, err := r.Lister().Pods("ns-c").List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing ns-c pods: %v", err)
	}
	if len(nsC) != 0 {
		t.Fatalf("expected 0 pods for out-of-scope namespace ns-c, got %d", len(nsC))
	}
	if _, err := r.Lister().Pods("ns-c").Get("c1"); err == nil {
		t.Fatal("expected NotFound error for pod in out-of-scope namespace")
	}
}

// TestNewPodsResourceFallsBackToClusterWideBeyondThreshold verifies that
// requesting more than maxNamespaceScopedPodInformers namespaces falls back
// to a single cluster-wide informer that sees every pod.
func TestNewPodsResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedPodInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newPod(ns, "pod"))
	}
	// Plus one pod in a namespace not in the requested list, to prove the
	// fallback really is cluster-wide rather than silently truncating.
	objs = append(objs, newPod("ns-other", "pod"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewPodsResource(cs, func() cache.SharedIndexInformer { return factory.Core().V1().Pods().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing pods: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d pods, got %d", len(namespaces)+1, len(all))
	}
}
