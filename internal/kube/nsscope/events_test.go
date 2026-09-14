package nsscope

import (
	"fmt"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newEvent(namespace, name string) *corev1.Event {
	return &corev1.Event{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewEventsResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newEvent("ns-a", "a1"), newEvent("ns-a", "a2"),
		newEvent("ns-b", "b1"),
		newEvent("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewEventsResource(cs, func() cache.SharedIndexInformer { return factory.Core().V1().Events().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing events: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 events across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no events from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewEventsResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedEventInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newEvent(ns, "event"))
	}
	objs = append(objs, newEvent("ns-other", "event"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewEventsResource(cs, func() cache.SharedIndexInformer { return factory.Core().V1().Events().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing events: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d events, got %d", len(namespaces)+1, len(all))
	}
}
