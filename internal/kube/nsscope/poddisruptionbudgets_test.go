package nsscope

import (
	"fmt"
	"testing"

	corev1 "k8s.io/api/core/v1"
	policyv1 "k8s.io/api/policy/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newPDB(namespace, name string) *policyv1.PodDisruptionBudget {
	return &policyv1.PodDisruptionBudget{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec: policyv1.PodDisruptionBudgetSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "x"}},
		},
	}
}

func newPodWithLabels(namespace, name string, labels map[string]string) *corev1.Pod {
	return &corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace, Labels: labels}}
}

func TestNewPodDisruptionBudgetsResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newPDB("ns-a", "a1"), newPDB("ns-a", "a2"),
		newPDB("ns-b", "b1"),
		newPDB("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewPodDisruptionBudgetsResource(cs, func() cache.SharedIndexInformer { return factory.Policy().V1().PodDisruptionBudgets().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing pdbs: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 pdbs across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no pdbs from unselected namespace ns-c, got %v", d)
		}
	}

	inScopePod := newPodWithLabels("ns-a", "pod-a", map[string]string{"app": "x"})
	matches, err := r.Lister().GetPodPodDisruptionBudgets(inScopePod)
	if err != nil {
		t.Fatalf("unexpected error getting PDBs for in-scope pod: %v", err)
	}
	if len(matches) != 2 {
		t.Fatalf("expected 2 matching PDBs (a1, a2) for in-scope pod, got %d", len(matches))
	}

	outOfScopePod := newPodWithLabels("ns-c", "pod-c", map[string]string{"app": "x"})
	if _, err := r.Lister().GetPodPodDisruptionBudgets(outOfScopePod); err == nil {
		t.Fatalf("expected error getting PDBs for out-of-scope pod namespace, got none")
	}
}

func TestNewPodDisruptionBudgetsResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedPodDisruptionBudgetInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newPDB(ns, "pdb"))
	}
	objs = append(objs, newPDB("ns-other", "pdb"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewPodDisruptionBudgetsResource(cs, func() cache.SharedIndexInformer { return factory.Policy().V1().PodDisruptionBudgets().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing pdbs: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d pdbs, got %d", len(namespaces)+1, len(all))
	}
}
