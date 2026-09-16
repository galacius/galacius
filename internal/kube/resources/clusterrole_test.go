package kubeResources

import (
	"testing"

	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	listersrbacv1 "k8s.io/client-go/listers/rbac/v1"
	"k8s.io/client-go/tools/cache"
)

func newClusterRoleLister(crs ...*rbacv1.ClusterRole) listersrbacv1.ClusterRoleLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{})
	for _, cr := range crs {
		_ = indexer.Add(cr)
	}
	return listersrbacv1.NewClusterRoleLister(indexer)
}

func makeClusterRole(name string) *rbacv1.ClusterRole {
	return &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
}

func TestListClusterRoles_SingleRole(t *testing.T) {
	cr := makeClusterRole("my-role")
	lister := newClusterRoleLister(cr)

	result, err := ListClusterRoles(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-role" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-role")
	}
}

func TestListClusterRoles_MultipleRoles(t *testing.T) {
	cr1 := makeClusterRole("role-a")
	cr2 := makeClusterRole("role-b")
	lister := newClusterRoleLister(cr1, cr2)

	result, err := ListClusterRoles(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 results, got %d", len(result))
	}
}

func TestListClusterRoles_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newClusterRoleLister()

	result, err := ListClusterRoles(lister)
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

func TestGetClusterRoleByName_Found(t *testing.T) {
	cr := makeClusterRole("my-role")
	lister := newClusterRoleLister(cr)

	result, err := GetClusterRoleByName(lister, "my-role")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-role" {
		t.Errorf("Name = %q; want %q", result.Name, "my-role")
	}
}

func TestGetClusterRoleByName_Age_NonZeroTimestamp(t *testing.T) {
	cr := makeClusterRole("my-role")
	lister := newClusterRoleLister(cr)

	result, err := GetClusterRoleByName(lister, "my-role")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToClusterRole_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	cr := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{Name: "cr"},
	}
	got := toClusterRole(cr)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}

func TestToClusterRole_NilLabelsAnnotations(t *testing.T) {
	cr := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-role",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
	got := toClusterRole(cr)
	if got.Labels == nil {
		t.Error("Labels must not be nil")
	}
	if got.Annotations == nil {
		t.Error("Annotations must not be nil")
	}
}

func TestToClusterRole_WithRules(t *testing.T) {
	cr := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-role",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Rules: []rbacv1.PolicyRule{
			{
				APIGroups: nil,
				Resources: []string{"pods"},
				Verbs:     []string{"get", "list"},
			},
		},
	}
	got := toClusterRole(cr)
	if len(got.Rules) != 1 {
		t.Fatalf("expected 1 rule, got %d", len(got.Rules))
	}
	if got.Rules[0].Resources[0] != "pods" {
		t.Errorf("Resource = %q; want %q", got.Rules[0].Resources[0], "pods")
	}
}
