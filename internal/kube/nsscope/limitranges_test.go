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

func newLimitRange(namespace, name string) *corev1.LimitRange {
	return &corev1.LimitRange{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewLimitRangesResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newLimitRange("ns-a", "a1"), newLimitRange("ns-a", "a2"),
		newLimitRange("ns-b", "b1"),
		newLimitRange("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewLimitRangesResource(cs, func() cache.SharedIndexInformer { return factory.Core().V1().LimitRanges().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing limitranges: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 limitranges across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no limitranges from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewLimitRangesResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedLimitRangeInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newLimitRange(ns, "lr"))
	}
	objs = append(objs, newLimitRange("ns-other", "lr"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewLimitRangesResource(cs, func() cache.SharedIndexInformer { return factory.Core().V1().LimitRanges().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing limitranges: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d limitranges, got %d", len(namespaces)+1, len(all))
	}
}
