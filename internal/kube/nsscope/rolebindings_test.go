package nsscope

import (
	"fmt"
	"testing"

	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newRoleBinding(namespace, name string) *rbacv1.RoleBinding {
	return &rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewRoleBindingsResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newRoleBinding("ns-a", "a1"), newRoleBinding("ns-a", "a2"),
		newRoleBinding("ns-b", "b1"),
		newRoleBinding("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewRoleBindingsResource(cs, func() cache.SharedIndexInformer { return factory.Rbac().V1().RoleBindings().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing rolebindings: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 rolebindings across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no rolebindings from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewRoleBindingsResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedRoleBindingInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newRoleBinding(ns, "rb"))
	}
	objs = append(objs, newRoleBinding("ns-other", "rb"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewRoleBindingsResource(cs, func() cache.SharedIndexInformer { return factory.Rbac().V1().RoleBindings().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing rolebindings: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d rolebindings, got %d", len(namespaces)+1, len(all))
	}
}
