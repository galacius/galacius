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

type errorPVLister struct{ err error }

func (e *errorPVLister) List(_ labels.Selector) ([]*corev1.PersistentVolume, error) {
	return nil, e.err
}
func (e *errorPVLister) Get(_ string) (*corev1.PersistentVolume, error) {
	return nil, e.err
}

func newPVLister(pvs ...*corev1.PersistentVolume) listerscorev1.PersistentVolumeLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{})
	for _, pv := range pvs {
		_ = indexer.Add(pv)
	}
	return listerscorev1.NewPersistentVolumeLister(indexer)
}

func makePersistentVolume(name string) *corev1.PersistentVolume {
	return &corev1.PersistentVolume{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Status: corev1.PersistentVolumeStatus{
			Phase: corev1.VolumeAvailable,
		},
	}
}

func TestListPersistentVolumes_Single(t *testing.T) {
	pv := makePersistentVolume("pv-1")
	lister := newPVLister(pv)

	result, err := ListPersistentVolumes(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "pv-1" {
		t.Errorf("Name = %q; want %q", result[0].Name, "pv-1")
	}
}

func TestListPersistentVolumes_Multiple(t *testing.T) {
	pv1 := makePersistentVolume("pv-1")
	pv2 := makePersistentVolume("pv-2")
	lister := newPVLister(pv1, pv2)

	result, err := ListPersistentVolumes(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 results, got %d", len(result))
	}
}

func TestListPersistentVolumes_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newPVLister()

	result, err := ListPersistentVolumes(lister)
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

func TestListPersistentVolumes_ErrorPropagation(t *testing.T) {
	sentinel := errors.New("store unavailable")
	_, err := ListPersistentVolumes(&errorPVLister{err: sentinel})
	if !errors.Is(err, sentinel) {
		t.Errorf("expected sentinel error; got %v", err)
	}
}

func TestToPersistentVolume_NoStorageClass_IsDash(t *testing.T) {
	pv := makePersistentVolume("pv")
	pv.Spec.StorageClassName = ""

	got := toPersistentVolume(pv)
	if got.StorageClass != "-" {
		t.Errorf("StorageClass = %q; want %q", got.StorageClass, "-")
	}
}

func TestToPersistentVolume_WithStorageClass(t *testing.T) {
	pv := makePersistentVolume("pv")
	pv.Spec.StorageClassName = "fast-ssd"

	got := toPersistentVolume(pv)
	if got.StorageClass != "fast-ssd" {
		t.Errorf("StorageClass = %q; want %q", got.StorageClass, "fast-ssd")
	}
}

func TestToPersistentVolume_NilClaimRef_IsDash(t *testing.T) {
	pv := makePersistentVolume("pv")
	pv.Spec.ClaimRef = nil

	got := toPersistentVolume(pv)
	if got.Claim != "-" {
		t.Errorf("Claim = %q; want %q", got.Claim, "-")
	}
}

func TestToPersistentVolume_WithClaimRef(t *testing.T) {
	pv := makePersistentVolume("pv")
	pv.Spec.ClaimRef = &corev1.ObjectReference{
		Namespace: "default",
		Name:      "my-pvc",
	}

	got := toPersistentVolume(pv)
	if got.Claim != "default/my-pvc" {
		t.Errorf("Claim = %q; want %q", got.Claim, "default/my-pvc")
	}
}

func TestToPersistentVolume_Terminating_StatusTerminating(t *testing.T) {
	pv := makePersistentVolume("pv")
	now := metav1.Now()
	pv.DeletionTimestamp = &now

	got := toPersistentVolume(pv)
	if got.Status != "Terminating" {
		t.Errorf("Status = %q; want %q", got.Status, "Terminating")
	}
}

func TestGetPersistentVolumeByName_Success(t *testing.T) {
	pv := makePersistentVolume("pv-1")
	pv.Labels = map[string]string{"type": "fast"}
	pv.Annotations = map[string]string{"note": "test"}
	lister := newPVLister(pv)

	result, err := GetPersistentVolumeByName(lister, "pv-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "pv-1" {
		t.Errorf("Name = %q; want %q", result.Name, "pv-1")
	}
}

func TestGetPersistentVolumeByName_NotFound(t *testing.T) {
	pv := makePersistentVolume("pv-1")
	lister := newPVLister(pv)

	_, err := GetPersistentVolumeByName(lister, "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent PV; got nil")
	}
}

func TestToPersistentVolumeDetail_EmptyAccessModes_EmptySlice(t *testing.T) {
	pv := makePersistentVolume("pv")
	pv.Spec.AccessModes = []corev1.PersistentVolumeAccessMode{}

	got := toPersistentVolumeDetail(pv)
	if len(got.AccessModes) != 0 {
		t.Errorf("AccessModes length = %d; want 0", len(got.AccessModes))
	}
}

func TestToPersistentVolumeDetail_WithAccessModes(t *testing.T) {
	pv := makePersistentVolume("pv")
	pv.Spec.AccessModes = []corev1.PersistentVolumeAccessMode{
		corev1.ReadWriteOnce,
		corev1.ReadOnlyMany,
	}

	got := toPersistentVolumeDetail(pv)
	if len(got.AccessModes) != 2 {
		t.Errorf("AccessModes length = %d; want 2", len(got.AccessModes))
	}
}

func TestToPersistentVolumeDetail_NilVolumeMode_IsDash(t *testing.T) {
	pv := makePersistentVolume("pv")
	pv.Spec.VolumeMode = nil

	got := toPersistentVolumeDetail(pv)
	if got.VolumeMode != "-" {
		t.Errorf("VolumeMode = %q; want %q", got.VolumeMode, "-")
	}
}

func TestToPersistentVolumeDetail_WithVolumeMode(t *testing.T) {
	pv := makePersistentVolume("pv")
	volumeMode := corev1.PersistentVolumeFilesystem
	pv.Spec.VolumeMode = &volumeMode

	got := toPersistentVolumeDetail(pv)
	if got.VolumeMode != string(corev1.PersistentVolumeFilesystem) {
		t.Errorf("VolumeMode = %q; want %q", got.VolumeMode, string(corev1.PersistentVolumeFilesystem))
	}
}

func TestToPersistentVolumeDetail_NilMountOptions_EmptySlice(t *testing.T) {
	pv := makePersistentVolume("pv")
	pv.Spec.MountOptions = nil

	got := toPersistentVolumeDetail(pv)
	if len(got.MountOptions) != 0 {
		t.Errorf("MountOptions length = %d; want 0", len(got.MountOptions))
	}
}

func TestToPersistentVolumeDetail_WithNodeAffinity(t *testing.T) {
	pv := makePersistentVolume("pv")
	pv.Spec.NodeAffinity = &corev1.VolumeNodeAffinity{
		Required: &corev1.NodeSelector{
			NodeSelectorTerms: []corev1.NodeSelectorTerm{
				{MatchExpressions: []corev1.NodeSelectorRequirement{}},
			},
		},
	}

	got := toPersistentVolumeDetail(pv)
	if got.NodeAffinitySummary != "Node affinity defined" {
		t.Errorf("NodeAffinitySummary = %q; want %q", got.NodeAffinitySummary, "Node affinity defined")
	}
}

func TestToPersistentVolumeDetail_NoNodeAffinity_IsDash(t *testing.T) {
	pv := makePersistentVolume("pv")
	pv.Spec.NodeAffinity = nil

	got := toPersistentVolumeDetail(pv)
	if got.NodeAffinitySummary != "-" {
		t.Errorf("NodeAffinitySummary = %q; want %q", got.NodeAffinitySummary, "-")
	}
}
