package nsscope

import (
	"fmt"
	"testing"

	discoveryv1 "k8s.io/api/discovery/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newEndpointSlice(namespace, name string) *discoveryv1.EndpointSlice {
	return &discoveryv1.EndpointSlice{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewEndpointSlicesResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newEndpointSlice("ns-a", "a1"), newEndpointSlice("ns-a", "a2"),
		newEndpointSlice("ns-b", "b1"),
		newEndpointSlice("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewEndpointSlicesResource(cs, func() cache.SharedIndexInformer { return factory.Discovery().V1().EndpointSlices().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing endpointslices: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 endpointslices across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no endpointslices from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewEndpointSlicesResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedEndpointSliceInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newEndpointSlice(ns, "eps"))
	}
	objs = append(objs, newEndpointSlice("ns-other", "eps"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewEndpointSlicesResource(cs, func() cache.SharedIndexInformer { return factory.Discovery().V1().EndpointSlices().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing endpointslices: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d endpointslices, got %d", len(namespaces)+1, len(all))
	}
}
