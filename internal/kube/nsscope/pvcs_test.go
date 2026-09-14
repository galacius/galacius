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

func newPVC(namespace, name string) *corev1.PersistentVolumeClaim {
	return &corev1.PersistentVolumeClaim{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewPersistentVolumeClaimsResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newPVC("ns-a", "a1"), newPVC("ns-a", "a2"),
		newPVC("ns-b", "b1"),
		newPVC("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewPersistentVolumeClaimsResource(cs, func() cache.SharedIndexInformer { return factory.Core().V1().PersistentVolumeClaims().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing pvcs: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 pvcs across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no pvcs from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewPersistentVolumeClaimsResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedPVCInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newPVC(ns, "pvc"))
	}
	objs = append(objs, newPVC("ns-other", "pvc"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewPersistentVolumeClaimsResource(cs, func() cache.SharedIndexInformer { return factory.Core().V1().PersistentVolumeClaims().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing pvcs: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d pvcs, got %d", len(namespaces)+1, len(all))
	}
}
