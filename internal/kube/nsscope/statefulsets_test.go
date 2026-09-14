package nsscope

import (
	"fmt"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newStatefulSet(namespace, name string, selector map[string]string) *appsv1.StatefulSet {
	return &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec: appsv1.StatefulSetSpec{
			Selector: &metav1.LabelSelector{MatchLabels: selector},
		},
	}
}

func TestNewStatefulSetsResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newStatefulSet("ns-a", "a1", map[string]string{"app": "a1"}),
		newStatefulSet("ns-b", "b1", map[string]string{"app": "b1"}),
		newStatefulSet("ns-c", "c1", map[string]string{"app": "c1"}), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewStatefulSetsResource(cs, func() cache.SharedIndexInformer { return factory.Apps().V1().StatefulSets().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing statefulsets: %v", err)
	}
	if len(all) != 2 {
		t.Fatalf("expected 2 statefulsets across ns-a/ns-b, got %d", len(all))
	}

	pod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Namespace: "ns-a", Labels: map[string]string{"app": "a1"}}}
	matches, err := r.Lister().GetPodStatefulSets(pod)
	if err != nil {
		t.Fatalf("unexpected error from GetPodStatefulSets: %v", err)
	}
	if len(matches) != 1 || matches[0].Name != "a1" {
		t.Fatalf("expected GetPodStatefulSets to find a1, got %v", matches)
	}

	outOfScopePod := &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "p", Namespace: "ns-c", Labels: map[string]string{"app": "c1"}}}
	if _, err := r.Lister().GetPodStatefulSets(outOfScopePod); err == nil {
		t.Fatal("expected error for pod in out-of-scope namespace")
	}
}

func TestNewStatefulSetsResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedStatefulSetInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newStatefulSet(ns, "ss", nil))
	}
	objs = append(objs, newStatefulSet("ns-other", "ss", nil))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewStatefulSetsResource(cs, func() cache.SharedIndexInformer { return factory.Apps().V1().StatefulSets().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing statefulsets: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d statefulsets, got %d", len(namespaces)+1, len(all))
	}
}
