package kubeResources

import (
	"testing"

	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	listersnetworkingv1 "k8s.io/client-go/listers/networking/v1"
	"k8s.io/client-go/tools/cache"
)

func newIngressClassLister(ics ...*networkingv1.IngressClass) listersnetworkingv1.IngressClassLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{})
	for _, ic := range ics {
		_ = indexer.Add(ic)
	}
	return listersnetworkingv1.NewIngressClassLister(indexer)
}

func makeIngressClass(name string) *networkingv1.IngressClass {
	return &networkingv1.IngressClass{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: networkingv1.IngressClassSpec{
			Controller: "example.com/ingress-controller",
		},
	}
}

func TestListIngressClasses_SingleClass(t *testing.T) {
	ic := makeIngressClass("my-class")
	lister := newIngressClassLister(ic)

	result, err := ListIngressClasses(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-class" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-class")
	}
}

func TestListIngressClasses_MultipleClasses(t *testing.T) {
	ic1 := makeIngressClass("class-a")
	ic2 := makeIngressClass("class-b")
	lister := newIngressClassLister(ic1, ic2)

	result, err := ListIngressClasses(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 results, got %d", len(result))
	}
}

func TestListIngressClasses_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newIngressClassLister()

	result, err := ListIngressClasses(lister)
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

func TestGetIngressClassByName_Found(t *testing.T) {
	ic := makeIngressClass("my-class")
	lister := newIngressClassLister(ic)

	result, err := GetIngressClassByName(lister, "my-class")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-class" {
		t.Errorf("Name = %q; want %q", result.Name, "my-class")
	}
}

func TestGetIngressClassByName_Age_NonZeroTimestamp(t *testing.T) {
	ic := makeIngressClass("my-class")
	lister := newIngressClassLister(ic)

	result, err := GetIngressClassByName(lister, "my-class")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToIngressClass_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	ic := &networkingv1.IngressClass{
		ObjectMeta: metav1.ObjectMeta{Name: "ic"},
		Spec: networkingv1.IngressClassSpec{
			Controller: "example.com/controller",
		},
	}
	got := toIngressClass(ic)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}

func TestToIngressClass_WithDefaultAnnotation(t *testing.T) {
	ic := &networkingv1.IngressClass{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-class",
			CreationTimestamp: metav1.Time{Time: fixedTime},
			Annotations: map[string]string{
				"ingressclass.kubernetes.io/is-default-class": "true",
			},
		},
		Spec: networkingv1.IngressClassSpec{
			Controller: "example.com/controller",
		},
	}
	got := toIngressClass(ic)
	if !got.IsDefault {
		t.Error("IsDefault should be true when annotation is present")
	}
}

func TestToIngressClass_WithoutDefaultAnnotation(t *testing.T) {
	ic := &networkingv1.IngressClass{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-class",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec: networkingv1.IngressClassSpec{
			Controller: "example.com/controller",
		},
	}
	got := toIngressClass(ic)
	if got.IsDefault {
		t.Error("IsDefault should be false when annotation is not present")
	}
}

func TestToIngressClass_WithFalseDefaultAnnotation(t *testing.T) {
	ic := &networkingv1.IngressClass{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-class",
			CreationTimestamp: metav1.Time{Time: fixedTime},
			Annotations: map[string]string{
				"ingressclass.kubernetes.io/is-default-class": "false",
			},
		},
		Spec: networkingv1.IngressClassSpec{
			Controller: "example.com/controller",
		},
	}
	got := toIngressClass(ic)
	if got.IsDefault {
		t.Error("IsDefault should be false when annotation value is false")
	}
}
