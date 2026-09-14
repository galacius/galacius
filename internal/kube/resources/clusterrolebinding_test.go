package kubeResources

import (
	"testing"

	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	listersrbacv1 "k8s.io/client-go/listers/rbac/v1"
	"k8s.io/client-go/tools/cache"
)

func newClusterRoleBindingLister(crbs ...*rbacv1.ClusterRoleBinding) listersrbacv1.ClusterRoleBindingLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{})
	for _, crb := range crbs {
		_ = indexer.Add(crb)
	}
	return listersrbacv1.NewClusterRoleBindingLister(indexer)
}

func makeClusterRoleBinding(name string) *rbacv1.ClusterRoleBinding {
	return &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		RoleRef: rbacv1.RoleRef{
			Kind:     "ClusterRole",
			APIGroup: "rbac.authorization.k8s.io",
		},
	}
}

func TestListClusterRoleBindings_SingleBinding(t *testing.T) {
	crb := makeClusterRoleBinding("my-binding")
	lister := newClusterRoleBindingLister(crb)

	result, err := ListClusterRoleBindings(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-binding" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-binding")
	}
}

func TestListClusterRoleBindings_MultipleBindings(t *testing.T) {
	crb1 := makeClusterRoleBinding("binding-a")
	crb2 := makeClusterRoleBinding("binding-b")
	lister := newClusterRoleBindingLister(crb1, crb2)

	result, err := ListClusterRoleBindings(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 results, got %d", len(result))
	}
}

func TestListClusterRoleBindings_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newClusterRoleBindingLister()

	result, err := ListClusterRoleBindings(lister)
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

func TestGetClusterRoleBindingByName_Found(t *testing.T) {
	crb := makeClusterRoleBinding("my-binding")
	lister := newClusterRoleBindingLister(crb)

	result, err := GetClusterRoleBindingByName(lister, "my-binding")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-binding" {
		t.Errorf("Name = %q; want %q", result.Name, "my-binding")
	}
}

func TestGetClusterRoleBindingByName_Age_NonZeroTimestamp(t *testing.T) {
	crb := makeClusterRoleBinding("my-binding")
	lister := newClusterRoleBindingLister(crb)

	result, err := GetClusterRoleBindingByName(lister, "my-binding")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToClusterRoleBinding_NilLabelsAnnotations(t *testing.T) {
	crb := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-binding",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
	got := toClusterRoleBinding(crb)
	if got.Labels == nil {
		t.Error("Labels must not be nil")
	}
	if got.Annotations == nil {
		t.Error("Annotations must not be nil")
	}
}

func TestToClusterRoleBinding_WithSubjects(t *testing.T) {
	crb := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-binding",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Subjects: []rbacv1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      "sa-1",
				Namespace: "default",
			},
			{
				Kind: "User",
				Name: "user-1",
			},
		},
	}
	got := toClusterRoleBinding(crb)
	if len(got.Subjects) != 2 {
		t.Fatalf("expected 2 subjects, got %d", len(got.Subjects))
	}
	if got.Subjects[0].Name != "sa-1" {
		t.Errorf("Subject 0 Name = %q; want %q", got.Subjects[0].Name, "sa-1")
	}
	if got.Subjects[1].Name != "user-1" {
		t.Errorf("Subject 1 Name = %q; want %q", got.Subjects[1].Name, "user-1")
	}
}

func TestToClusterRoleBinding_NoSubjects_BindingsIsHyphen(t *testing.T) {
	crb := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-binding",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
	got := toClusterRoleBinding(crb)
	if got.Bindings != "-" {
		t.Errorf("Bindings = %q; want %q", got.Bindings, "-")
	}
}
