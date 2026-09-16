package nsscope

import (
	"fmt"
	"testing"

	autoscalingv2 "k8s.io/api/autoscaling/v2"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newHPA(namespace, name string) *autoscalingv2.HorizontalPodAutoscaler {
	return &autoscalingv2.HorizontalPodAutoscaler{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewHorizontalPodAutoscalersResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newHPA("ns-a", "a1"), newHPA("ns-a", "a2"),
		newHPA("ns-b", "b1"),
		newHPA("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewHorizontalPodAutoscalersResource(cs, func() cache.SharedIndexInformer {
		return factory.Autoscaling().V2().HorizontalPodAutoscalers().Informer()
	}, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing hpas: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 hpas across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no hpas from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewHorizontalPodAutoscalersResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedHPAInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newHPA(ns, "hpa"))
	}
	objs = append(objs, newHPA("ns-other", "hpa"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewHorizontalPodAutoscalersResource(cs, func() cache.SharedIndexInformer {
		return factory.Autoscaling().V2().HorizontalPodAutoscalers().Informer()
	}, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing hpas: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d hpas, got %d", len(namespaces)+1, len(all))
	}
}
