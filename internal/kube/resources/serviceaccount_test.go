package kubeResources

import (
	"errors"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	"k8s.io/client-go/tools/cache"
)

type errorServiceAccountLister struct{ err error }

func (e *errorServiceAccountLister) List(_ labels.Selector) ([]*corev1.ServiceAccount, error) {
	return nil, e.err
}
func (e *errorServiceAccountLister) ServiceAccounts(_ string) listerscorev1.ServiceAccountNamespaceLister {
	return &errorServiceAccountNamespaceLister{e.err}
}

type errorServiceAccountNamespaceLister struct{ err error }

func (e *errorServiceAccountNamespaceLister) List(_ labels.Selector) ([]*corev1.ServiceAccount, error) {
	return nil, e.err
}
func (e *errorServiceAccountNamespaceLister) Get(_ string) (*corev1.ServiceAccount, error) {
	return nil, e.err
}

func newServiceAccountLister(sas ...*corev1.ServiceAccount) listerscorev1.ServiceAccountLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, sa := range sas {
		_ = indexer.Add(sa)
	}
	return listerscorev1.NewServiceAccountLister(indexer)
}

func makeServiceAccount(name, namespace string) *corev1.ServiceAccount {
	return &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
}

func TestListServiceAccounts_SingleNamespace(t *testing.T) {
	sa := makeServiceAccount("default", "default")
	lister := newServiceAccountLister(sa)

	result, err := ListServiceAccounts(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "default" {
		t.Errorf("Name = %q; want %q", result[0].Name, "default")
	}
}

func TestListServiceAccounts_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	sa1 := makeServiceAccount("sa-a", "ns-a")
	sa2 := makeServiceAccount("sa-b", "ns-b")
	lister := newServiceAccountLister(sa1, sa2)

	result, err := ListServiceAccounts(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListServiceAccounts_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newServiceAccountLister()

	result, err := ListServiceAccounts(lister, nil)
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

func TestListServiceAccounts_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListServiceAccounts(&errorServiceAccountLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListServiceAccounts_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListServiceAccounts(&errorServiceAccountLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestToServiceAccount_NoSecrets_EmptySlice(t *testing.T) {
	sa := makeServiceAccount("sa", "default")
	sa.Secrets = []corev1.ObjectReference{}

	got := toServiceAccount(sa)
	if len(got.Secrets) != 0 {
		t.Errorf("Secrets length = %d; want 0", len(got.Secrets))
	}
}

func TestToServiceAccount_WithSecrets(t *testing.T) {
	sa := makeServiceAccount("sa", "default")
	sa.Secrets = []corev1.ObjectReference{
		{Name: "token-secret"},
		{Name: "docker-secret"},
	}

	got := toServiceAccount(sa)
	if len(got.Secrets) != 2 {
		t.Fatalf("Secrets length = %d; want 2", len(got.Secrets))
	}
	if got.Secrets[0] != "token-secret" {
		t.Errorf("Secrets[0] = %q; want %q", got.Secrets[0], "token-secret")
	}
	if got.Secrets[1] != "docker-secret" {
		t.Errorf("Secrets[1] = %q; want %q", got.Secrets[1], "docker-secret")
	}
}

func TestGetServiceAccountByName_Success(t *testing.T) {
	sa := makeServiceAccount("app-sa", "default")
	sa.Secrets = []corev1.ObjectReference{
		{Name: "app-sa-token"},
	}
	lister := newServiceAccountLister(sa)

	result, err := GetServiceAccountByName(lister, "default", "app-sa")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "app-sa" {
		t.Errorf("Name = %q; want %q", result.Name, "app-sa")
	}
	if len(result.Secrets) != 1 {
		t.Errorf("Secrets length = %d; want 1", len(result.Secrets))
	}
}

func TestGetServiceAccountByName_NotFound(t *testing.T) {
	sa := makeServiceAccount("app-sa", "default")
	lister := newServiceAccountLister(sa)

	_, err := GetServiceAccountByName(lister, "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent ServiceAccount; got nil")
	}
}
