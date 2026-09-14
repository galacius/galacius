package kubeResources

import (
	"errors"
	"testing"

	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersrbacv1 "k8s.io/client-go/listers/rbac/v1"
	"k8s.io/client-go/tools/cache"
)

type errorRoleBindingLister struct{ err error }

func (e *errorRoleBindingLister) List(_ labels.Selector) ([]*rbacv1.RoleBinding, error) {
	return nil, e.err
}
func (e *errorRoleBindingLister) RoleBindings(_ string) listersrbacv1.RoleBindingNamespaceLister {
	return &errorRoleBindingNamespaceLister{e.err}
}

type errorRoleBindingNamespaceLister struct{ err error }

func (e *errorRoleBindingNamespaceLister) List(_ labels.Selector) ([]*rbacv1.RoleBinding, error) {
	return nil, e.err
}
func (e *errorRoleBindingNamespaceLister) Get(_ string) (*rbacv1.RoleBinding, error) {
	return nil, e.err
}

func newRoleBindingLister(rbs ...*rbacv1.RoleBinding) listersrbacv1.RoleBindingLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, rb := range rbs {
		_ = indexer.Add(rb)
	}
	return listersrbacv1.NewRoleBindingLister(indexer)
}

func makeRoleBinding(name, namespace string) *rbacv1.RoleBinding {
	return &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "Role",
			Name:     "reader",
		},
	}
}

func TestListRoleBindings_SingleNamespace(t *testing.T) {
	rb := makeRoleBinding("read-binding", "default")
	lister := newRoleBindingLister(rb)

	result, err := ListRoleBindings(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "read-binding" {
		t.Errorf("Name = %q; want %q", result[0].Name, "read-binding")
	}
}

func TestListRoleBindings_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	rb1 := makeRoleBinding("rb-a", "ns-a")
	rb2 := makeRoleBinding("rb-b", "ns-b")
	lister := newRoleBindingLister(rb1, rb2)

	result, err := ListRoleBindings(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListRoleBindings_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newRoleBindingLister()

	result, err := ListRoleBindings(lister, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Error("expected non-nil slice; got nil")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result; got %d items", len(result))
	}
}

func TestListRoleBindings_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListRoleBindings(&errorRoleBindingLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListRoleBindings_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListRoleBindings(&errorRoleBindingLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestToRoleBinding_EmptySubjects_IsDash(t *testing.T) {
	rb := makeRoleBinding("rb", "default")
	rb.Subjects = []rbacv1.Subject{}

	got := toRoleBinding(rb)
	if got.Bindings != "-" {
		t.Errorf("Bindings = %q; want %q", got.Bindings, "-")
	}
}

func TestToRoleBinding_SingleSubject(t *testing.T) {
	rb := makeRoleBinding("rb", "default")
	rb.Subjects = []rbacv1.Subject{
		{Name: "user1", Kind: "User"},
	}

	got := toRoleBinding(rb)
	if got.Bindings != "user1" {
		t.Errorf("Bindings = %q; want %q", got.Bindings, "user1")
	}
}

func TestToRoleBinding_MultipleSubjects(t *testing.T) {
	rb := makeRoleBinding("rb", "default")
	rb.Subjects = []rbacv1.Subject{
		{Name: "user1", Kind: "User"},
		{Name: "user2", Kind: "User"},
	}

	got := toRoleBinding(rb)
	if got.Bindings != "user1, user2" {
		t.Errorf("Bindings = %q; want %q", got.Bindings, "user1, user2")
	}
}

func TestToRoleBinding_DuplicateKinds_OnceInTypes(t *testing.T) {
	rb := makeRoleBinding("rb", "default")
	rb.Subjects = []rbacv1.Subject{
		{Name: "user1", Kind: "User"},
		{Name: "user2", Kind: "User"},
		{Name: "sa1", Kind: "ServiceAccount"},
	}

	got := toRoleBinding(rb)
	if got.Types != "User, ServiceAccount" && got.Types != "ServiceAccount, User" {
		t.Errorf("Types = %q; want each kind once", got.Types)
	}
}

func TestToRoleBinding_NilLabels_EmptyMap(t *testing.T) {
	rb := makeRoleBinding("rb", "default")
	rb.Labels = nil

	got := toRoleBinding(rb)
	if len(got.Labels) != 0 {
		t.Errorf("Labels length = %d; want 0", len(got.Labels))
	}
}

func TestToRoleBinding_NilAnnotations_EmptyMap(t *testing.T) {
	rb := makeRoleBinding("rb", "default")
	rb.Annotations = nil

	got := toRoleBinding(rb)
	if len(got.Annotations) != 0 {
		t.Errorf("Annotations length = %d; want 0", len(got.Annotations))
	}
}

func TestGetRoleBindingByName_Success(t *testing.T) {
	rb := makeRoleBinding("read-binding", "default")
	rb.Subjects = []rbacv1.Subject{
		{Name: "user1", Kind: "User"},
	}
	lister := newRoleBindingLister(rb)

	result, err := GetRoleBindingByName(lister, "default", "read-binding")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "read-binding" {
		t.Errorf("Name = %q; want %q", result.Name, "read-binding")
	}
	if len(result.Subjects) != 1 {
		t.Errorf("Subjects length = %d; want 1", len(result.Subjects))
	}
}

func TestGetRoleBindingByName_NotFound(t *testing.T) {
	rb := makeRoleBinding("read-binding", "default")
	lister := newRoleBindingLister(rb)

	_, err := GetRoleBindingByName(lister, "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent RoleBinding; got nil")
	}
}

func TestToRoleBinding_RoleRef(t *testing.T) {
	rb := makeRoleBinding("rb", "default")
	rb.RoleRef = rbacv1.RoleRef{
		APIGroup: "rbac.authorization.k8s.io",
		Kind:     "ClusterRole",
		Name:     "admin",
	}

	got := toRoleBinding(rb)
	if got.RoleRefName != "admin" {
		t.Errorf("RoleRefName = %q; want %q", got.RoleRefName, "admin")
	}
	if got.RoleRefKind != "ClusterRole" {
		t.Errorf("RoleRefKind = %q; want %q", got.RoleRefKind, "ClusterRole")
	}
	if got.RoleRefGroup != "rbac.authorization.k8s.io" {
		t.Errorf("RoleRefGroup = %q; want %q", got.RoleRefGroup, "rbac.authorization.k8s.io")
	}
}
