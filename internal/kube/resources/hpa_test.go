package kubeResources

import (
	"errors"
	"testing"

	autoscalingv2 "k8s.io/api/autoscaling/v2"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersautoscalingv2 "k8s.io/client-go/listers/autoscaling/v2"
	"k8s.io/client-go/tools/cache"
)

type errorHPALister struct{ err error }

func (e *errorHPALister) List(_ labels.Selector) ([]*autoscalingv2.HorizontalPodAutoscaler, error) {
	return nil, e.err
}
func (e *errorHPALister) HorizontalPodAutoscalers(_ string) listersautoscalingv2.HorizontalPodAutoscalerNamespaceLister {
	return &errorHPANamespaceLister{e.err}
}

type errorHPANamespaceLister struct{ err error }

func (e *errorHPANamespaceLister) List(_ labels.Selector) ([]*autoscalingv2.HorizontalPodAutoscaler, error) {
	return nil, e.err
}
func (e *errorHPANamespaceLister) Get(_ string) (*autoscalingv2.HorizontalPodAutoscaler, error) {
	return nil, e.err
}

func newHPALister(hpas ...*autoscalingv2.HorizontalPodAutoscaler) listersautoscalingv2.HorizontalPodAutoscalerLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, hpa := range hpas {
		_ = indexer.Add(hpa)
	}
	return listersautoscalingv2.NewHorizontalPodAutoscalerLister(indexer)
}

func makeHPA(name, namespace string) *autoscalingv2.HorizontalPodAutoscaler {
	minReplicas := int32(1)
	return &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
				APIVersion: "apps/v1",
				Kind:       "Deployment",
				Name:       "target-deployment",
			},
			MinReplicas: &minReplicas,
			MaxReplicas: 10,
		},
	}
}

func TestListHPAs_SingleNamespace(t *testing.T) {
	hpa := makeHPA("my-hpa", "production")
	lister := newHPALister(hpa)

	result, err := ListHPAs(lister, []string{"production"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-hpa" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-hpa")
	}
}

func TestListHPAs_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	hpa1 := makeHPA("hpa-a", "ns-a")
	hpa2 := makeHPA("hpa-b", "ns-b")
	lister := newHPALister(hpa1, hpa2)

	result, err := ListHPAs(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListHPAs_SpecificNamespaceFilters(t *testing.T) {
	hpa1 := makeHPA("hpa-a", "ns-a")
	hpa2 := makeHPA("hpa-b", "ns-b")
	lister := newHPALister(hpa1, hpa2)

	result, err := ListHPAs(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "hpa-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "hpa-a")
	}
}

func TestListHPAs_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newHPALister()

	result, err := ListHPAs(lister, []string{"default"})
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

func TestListHPAs_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListHPAs(&errorHPALister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListHPAs_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListHPAs(&errorHPALister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestGetHPAByName_Found(t *testing.T) {
	hpa := makeHPA("my-hpa", "production")
	lister := newHPALister(hpa)

	result, err := GetHPAByName(lister, "production", "my-hpa")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-hpa" {
		t.Errorf("Name = %q; want %q", result.Name, "my-hpa")
	}
}

func TestGetHPAByName_Age_NonZeroTimestamp(t *testing.T) {
	hpa := makeHPA("my-hpa", "default")
	lister := newHPALister(hpa)

	result, err := GetHPAByName(lister, "default", "my-hpa")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToHPA_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	minReplicas := int32(1)
	hpa := &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "hpa",
			Namespace: "default",
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
				Kind: "Deployment",
				Name: "target",
			},
			MinReplicas: &minReplicas,
			MaxReplicas: 10,
		},
	}
	got := toHPA(hpa)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}

func TestToHPA_Replicas(t *testing.T) {
	minReplicas := int32(2)
	hpa := &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-hpa",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
				Kind: "Deployment",
				Name: "target",
			},
			MinReplicas: &minReplicas,
			MaxReplicas: 5,
		},
	}
	got := toHPA(hpa)
	if got.MaxPods != 5 {
		t.Errorf("MaxPods = %d; want 5", got.MaxPods)
	}
}

func TestToHPADetail_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	minReplicas := int32(1)
	hpa := &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "hpa",
			Namespace: "default",
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
				Kind: "Deployment",
				Name: "target",
			},
			MinReplicas: &minReplicas,
			MaxReplicas: 10,
		},
	}
	got := toHPADetail(hpa)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}
