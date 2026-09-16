package kubeResources

import (
	"errors"
	"testing"

	storagev1 "k8s.io/api/storage/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersstoragev1 "k8s.io/client-go/listers/storage/v1"
	"k8s.io/client-go/tools/cache"
)

type errorStorageClassLister struct{ err error }

func (e *errorStorageClassLister) List(_ labels.Selector) ([]*storagev1.StorageClass, error) {
	return nil, e.err
}
func (e *errorStorageClassLister) Get(_ string) (*storagev1.StorageClass, error) {
	return nil, e.err
}

func newStorageClassLister(scs ...*storagev1.StorageClass) listersstoragev1.StorageClassLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{})
	for _, sc := range scs {
		_ = indexer.Add(sc)
	}
	return listersstoragev1.NewStorageClassLister(indexer)
}

func makeStorageClass(name string) *storagev1.StorageClass {
	return &storagev1.StorageClass{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Provisioner: "kubernetes.io/aws-ebs",
	}
}

func TestListStorageClasses_Single(t *testing.T) {
	sc := makeStorageClass("fast-ssd")
	lister := newStorageClassLister(sc)

	result, err := ListStorageClasses(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "fast-ssd" {
		t.Errorf("Name = %q; want %q", result[0].Name, "fast-ssd")
	}
}

func TestListStorageClasses_Multiple(t *testing.T) {
	sc1 := makeStorageClass("fast-ssd")
	sc2 := makeStorageClass("slow-hdd")
	lister := newStorageClassLister(sc1, sc2)

	result, err := ListStorageClasses(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 results, got %d", len(result))
	}
}

func TestListStorageClasses_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newStorageClassLister()

	result, err := ListStorageClasses(lister)
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

func TestListStorageClasses_ErrorPropagation(t *testing.T) {
	sentinel := errors.New("store unavailable")
	_, err := ListStorageClasses(&errorStorageClassLister{err: sentinel})
	if !errors.Is(err, sentinel) {
		t.Errorf("expected sentinel error; got %v", err)
	}
}

func TestToStorageClass_NilReclaimPolicy_EmptyString(t *testing.T) {
	sc := makeStorageClass("sc")
	sc.ReclaimPolicy = nil

	got := toStorageClass(sc)
	if got.ReclaimPolicy != "" {
		t.Errorf("ReclaimPolicy = %q; want empty string", got.ReclaimPolicy)
	}
}

func TestToStorageClass_Default_True(t *testing.T) {
	sc := makeStorageClass("sc")
	sc.Annotations = map[string]string{
		"storageclass.kubernetes.io/is-default-class": "true",
	}

	got := toStorageClass(sc)
	if got.Default != true {
		t.Errorf("Default = %v; want true", got.Default)
	}
}

func TestToStorageClass_Default_False(t *testing.T) {
	sc := makeStorageClass("sc")
	sc.Annotations = map[string]string{}

	got := toStorageClass(sc)
	if got.Default != false {
		t.Errorf("Default = %v; want false", got.Default)
	}
}

func TestToStorageClass_NilVolumeBindingMode_EmptyString(t *testing.T) {
	sc := makeStorageClass("sc")
	sc.VolumeBindingMode = nil

	got := toStorageClass(sc)
	if got.VolumeBindingMode != "" {
		t.Errorf("VolumeBindingMode = %q; want empty string", got.VolumeBindingMode)
	}
}

func TestToStorageClass_WithVolumeBindingMode(t *testing.T) {
	sc := makeStorageClass("sc")
	mode := storagev1.VolumeBindingWaitForFirstConsumer
	sc.VolumeBindingMode = &mode

	got := toStorageClass(sc)
	if got.VolumeBindingMode != string(storagev1.VolumeBindingWaitForFirstConsumer) {
		t.Errorf("VolumeBindingMode = %q; want %q", got.VolumeBindingMode, string(storagev1.VolumeBindingWaitForFirstConsumer))
	}
}

func TestToStorageClass_NilMountOptions_EmptySlice(t *testing.T) {
	sc := makeStorageClass("sc")
	sc.MountOptions = nil

	got := toStorageClass(sc)
	if len(got.MountOptions) != 0 {
		t.Errorf("MountOptions length = %d; want 0", len(got.MountOptions))
	}
}

func TestToStorageClass_WithMountOptions(t *testing.T) {
	sc := makeStorageClass("sc")
	sc.MountOptions = []string{"noatime", "nodiratime"}

	got := toStorageClass(sc)
	if len(got.MountOptions) != 2 {
		t.Errorf("MountOptions length = %d; want 2", len(got.MountOptions))
	}
}

func TestToStorageClass_NilParameters_EmptyMap(t *testing.T) {
	sc := makeStorageClass("sc")
	sc.Parameters = nil

	got := toStorageClass(sc)
	if len(got.Parameters) != 0 {
		t.Errorf("Parameters length = %d; want 0", len(got.Parameters))
	}
}

func TestToStorageClass_WithParameters(t *testing.T) {
	sc := makeStorageClass("sc")
	sc.Parameters = map[string]string{
		"type": "gp2",
		"iops": "3000",
	}

	got := toStorageClass(sc)
	if len(got.Parameters) != 2 {
		t.Errorf("Parameters length = %d; want 2", len(got.Parameters))
	}
}

func TestGetStorageClassByName_Success(t *testing.T) {
	sc := makeStorageClass("fast-ssd")
	sc.Provisioner = "ebs.csi.aws.com"
	lister := newStorageClassLister(sc)

	result, err := GetStorageClassByName(lister, "fast-ssd")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "fast-ssd" {
		t.Errorf("Name = %q; want %q", result.Name, "fast-ssd")
	}
	if result.Provisioner != "ebs.csi.aws.com" {
		t.Errorf("Provisioner = %q; want %q", result.Provisioner, "ebs.csi.aws.com")
	}
}

func TestGetStorageClassByName_NotFound(t *testing.T) {
	sc := makeStorageClass("fast-ssd")
	lister := newStorageClassLister(sc)

	_, err := GetStorageClassByName(lister, "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent StorageClass; got nil")
	}
}
