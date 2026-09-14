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

func newRole(namespace, name string) *rbacv1.Role {
	return &rbacv1.Role{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewRolesResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newRole("ns-a", "a1"), newRole("ns-a", "a2"),
		newRole("ns-b", "b1"),
		newRole("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewRolesResource(cs, func() cache.SharedIndexInformer { return factory.Rbac().V1().Roles().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing roles: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 roles across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no roles from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewRolesResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedRoleInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newRole(ns, "role"))
	}
	objs = append(objs, newRole("ns-other", "role"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewRolesResource(cs, func() cache.SharedIndexInformer { return factory.Rbac().V1().Roles().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing roles: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d roles, got %d", len(namespaces)+1, len(all))
	}
}
