package kubeResources

import (
	"encoding/base64"
	"errors"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	"k8s.io/client-go/tools/cache"
)

type errorSecretLister struct{ err error }

func (e *errorSecretLister) List(_ labels.Selector) ([]*corev1.Secret, error) {
	return nil, e.err
}
func (e *errorSecretLister) Secrets(_ string) listerscorev1.SecretNamespaceLister {
	return &errorSecretNamespaceLister{e.err}
}

type errorSecretNamespaceLister struct{ err error }

func (e *errorSecretNamespaceLister) List(_ labels.Selector) ([]*corev1.Secret, error) {
	return nil, e.err
}
func (e *errorSecretNamespaceLister) Get(_ string) (*corev1.Secret, error) {
	return nil, e.err
}

func newSecretLister(secrets ...*corev1.Secret) listerscorev1.SecretLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, s := range secrets {
		_ = indexer.Add(s)
	}
	return listerscorev1.NewSecretLister(indexer)
}

func makeSecret(name, namespace string) *corev1.Secret {
	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Type: corev1.SecretTypeOpaque,
	}
}

func TestListSecrets_SingleNamespace(t *testing.T) {
	s := makeSecret("secret-1", "default")
	lister := newSecretLister(s)

	result, err := ListSecrets(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "secret-1" {
		t.Errorf("Name = %q; want %q", result[0].Name, "secret-1")
	}
}

func TestListSecrets_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	s1 := makeSecret("s-a", "ns-a")
	s2 := makeSecret("s-b", "ns-b")
	lister := newSecretLister(s1, s2)

	result, err := ListSecrets(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListSecrets_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newSecretLister()

	result, err := ListSecrets(lister, nil)
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

func TestListSecrets_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListSecrets(&errorSecretLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListSecrets_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListSecrets(&errorSecretLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestToSecret_EmptyLabels_EmptySlice(t *testing.T) {
	s := makeSecret("secret", "default")
	s.Labels = map[string]string{}

	got := toSecret(s)
	if len(got.Labels) != 0 {
		t.Errorf("Labels length = %d; want 0", len(got.Labels))
	}
}

func TestToSecret_WithLabels(t *testing.T) {
	s := makeSecret("secret", "default")
	s.Labels = map[string]string{"app": "test"}

	got := toSecret(s)
	if len(got.Labels) != 1 {
		t.Fatalf("Labels length = %d; want 1", len(got.Labels))
	}
	if got.Labels[0] != "app=test" {
		t.Errorf("Labels[0] = %q; want %q", got.Labels[0], "app=test")
	}
}

func TestToSecret_EmptyData_EmptyKeys(t *testing.T) {
	s := makeSecret("secret", "default")
	s.Data = map[string][]byte{}

	got := toSecret(s)
	if len(got.Keys) != 0 {
		t.Errorf("Keys length = %d; want 0", len(got.Keys))
	}
}

func TestToSecret_WithData(t *testing.T) {
	s := makeSecret("secret", "default")
	s.Data = map[string][]byte{
		"key1": []byte("value1"),
		"key2": []byte("value2"),
	}

	got := toSecret(s)
	if len(got.Keys) != 2 {
		t.Fatalf("Keys length = %d; want 2", len(got.Keys))
	}
}

func TestToSecret_WithStringData(t *testing.T) {
	s := makeSecret("secret", "default")
	s.StringData = map[string]string{
		"username": "admin",
		"password": "secret",
	}

	got := toSecret(s)
	if len(got.Keys) != 2 {
		t.Fatalf("Keys length = %d; want 2", len(got.Keys))
	}
}

func TestToSecret_TypeOpaque(t *testing.T) {
	s := makeSecret("secret", "default")
	s.Type = corev1.SecretTypeOpaque

	got := toSecret(s)
	if got.Type != string(corev1.SecretTypeOpaque) {
		t.Errorf("Type = %q; want %q", got.Type, string(corev1.SecretTypeOpaque))
	}
}

func TestGetSecretByName_Success(t *testing.T) {
	s := makeSecret("secret-1", "default")
	s.Labels = map[string]string{"env": "prod"}
	s.Data = map[string][]byte{"key": []byte("value")}
	lister := newSecretLister(s)

	result, err := GetSecretByName(lister, "default", "secret-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.Name != "secret-1" {
		t.Errorf("Name = %q; want %q", result.Name, "secret-1")
	}
}

func TestGetSecretByName_NotFound(t *testing.T) {
	s := makeSecret("secret-1", "default")
	lister := newSecretLister(s)

	_, err := GetSecretByName(lister, "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent Secret; got nil")
	}
}

func TestGetSecretByName_DataBase64Encoded(t *testing.T) {
	s := makeSecret("secret-1", "default")
	s.Data = map[string][]byte{
		"password": []byte("mysecret"),
	}
	lister := newSecretLister(s)

	result, err := GetSecretByName(lister, "default", "secret-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := base64.StdEncoding.EncodeToString([]byte("mysecret"))
	if result.Data["password"] != expected {
		t.Errorf("Data[password] = %q; want %q", result.Data["password"], expected)
	}
}

func TestGetSecretByName_EmptyData_EmptyMap(t *testing.T) {
	s := makeSecret("secret-1", "default")
	s.Data = map[string][]byte{}
	lister := newSecretLister(s)

	result, err := GetSecretByName(lister, "default", "secret-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Data) != 0 {
		t.Errorf("Data length = %d; want 0", len(result.Data))
	}
}

func TestGetSecretByName_WithLabelsAndAnnotations(t *testing.T) {
	s := makeSecret("secret-1", "default")
	s.Labels = map[string]string{"app": "test"}
	s.Annotations = map[string]string{"note": "important"}
	lister := newSecretLister(s)

	result, err := GetSecretByName(lister, "default", "secret-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Labels) != 1 {
		t.Errorf("Labels length = %d; want 1", len(result.Labels))
	}
	if len(result.Annotations) != 1 {
		t.Errorf("Annotations length = %d; want 1", len(result.Annotations))
	}
}
