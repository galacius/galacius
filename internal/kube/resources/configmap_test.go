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

type errorConfigMapLister struct{ err error }

func (e *errorConfigMapLister) List(_ labels.Selector) ([]*corev1.ConfigMap, error) {
	return nil, e.err
}
func (e *errorConfigMapLister) ConfigMaps(_ string) listerscorev1.ConfigMapNamespaceLister {
	return &errorConfigMapNamespaceLister{e.err}
}

type errorConfigMapNamespaceLister struct{ err error }

func (e *errorConfigMapNamespaceLister) List(_ labels.Selector) ([]*corev1.ConfigMap, error) {
	return nil, e.err
}
func (e *errorConfigMapNamespaceLister) Get(_ string) (*corev1.ConfigMap, error) {
	return nil, e.err
}

func newConfigMapLister(cms ...*corev1.ConfigMap) listerscorev1.ConfigMapLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, cm := range cms {
		_ = indexer.Add(cm)
	}
	return listerscorev1.NewConfigMapLister(indexer)
}

func makeConfigMap(name, namespace string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Data: map[string]string{
			"key1": "value1",
		},
	}
}

func TestListConfigMaps_SingleNamespace(t *testing.T) {
	cm := makeConfigMap("my-config", "production")
	lister := newConfigMapLister(cm)

	result, err := ListConfigMaps(lister, []string{"production"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-config" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-config")
	}
}

func TestListConfigMaps_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	cm1 := makeConfigMap("cm-a", "ns-a")
	cm2 := makeConfigMap("cm-b", "ns-b")
	lister := newConfigMapLister(cm1, cm2)

	result, err := ListConfigMaps(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListConfigMaps_SpecificNamespaceFilters(t *testing.T) {
	cm1 := makeConfigMap("cm-a", "ns-a")
	cm2 := makeConfigMap("cm-b", "ns-b")
	lister := newConfigMapLister(cm1, cm2)

	result, err := ListConfigMaps(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "cm-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "cm-a")
	}
}

func TestListConfigMaps_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newConfigMapLister()

	result, err := ListConfigMaps(lister, []string{"default"})
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

func TestListConfigMaps_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListConfigMaps(&errorConfigMapLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListConfigMaps_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListConfigMaps(&errorConfigMapLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestGetConfigMapByName_Found(t *testing.T) {
	cm := makeConfigMap("my-config", "production")
	lister := newConfigMapLister(cm)

	result, err := GetConfigMapByName(lister, "production", "my-config")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-config" {
		t.Errorf("Name = %q; want %q", result.Name, "my-config")
	}
}

func TestGetConfigMapByName_Age_NonZeroTimestamp(t *testing.T) {
	cm := makeConfigMap("my-config", "default")
	lister := newConfigMapLister(cm)

	result, err := GetConfigMapByName(lister, "default", "my-config")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToConfigMap_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "config",
			Namespace: "default",
		},
	}
	got := toConfigMap(cm)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}

func TestToConfigMap_WithData(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "config",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Data: map[string]string{
			"key1": "value1",
			"key2": "value2",
		},
	}
	got := toConfigMap(cm)
	if len(got.Keys) != 2 {
		t.Fatalf("expected 2 keys, got %d", len(got.Keys))
	}
}

func TestToConfigMap_EmptyData(t *testing.T) {
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "config",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
	got := toConfigMap(cm)
	if got.Keys == nil {
		t.Error("Keys must not be nil")
	}
	if len(got.Keys) != 0 {
		t.Errorf("expected 0 keys, got %d", len(got.Keys))
	}
}
