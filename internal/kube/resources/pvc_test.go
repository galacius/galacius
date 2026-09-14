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

type errorPVCLister struct{ err error }

func (e *errorPVCLister) List(_ labels.Selector) ([]*corev1.PersistentVolumeClaim, error) {
	return nil, e.err
}
func (e *errorPVCLister) PersistentVolumeClaims(_ string) listerscorev1.PersistentVolumeClaimNamespaceLister {
	return &errorPVCNamespaceLister{e.err}
}

type errorPVCNamespaceLister struct{ err error }

func (e *errorPVCNamespaceLister) List(_ labels.Selector) ([]*corev1.PersistentVolumeClaim, error) {
	return nil, e.err
}
func (e *errorPVCNamespaceLister) Get(_ string) (*corev1.PersistentVolumeClaim, error) {
	return nil, e.err
}

func newPVCLister(pvcs ...*corev1.PersistentVolumeClaim) listerscorev1.PersistentVolumeClaimLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, pvc := range pvcs {
		_ = indexer.Add(pvc)
	}
	return listerscorev1.NewPersistentVolumeClaimLister(indexer)
}

func makePVC(name, namespace string) *corev1.PersistentVolumeClaim {
	return &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Status: corev1.PersistentVolumeClaimStatus{
			Phase: corev1.ClaimBound,
		},
	}
}

func TestListPersistentVolumeClaims_SingleNamespace(t *testing.T) {
	pvc := makePVC("pvc-1", "default")
	pvcLister := newPVCLister(pvc)
	podLister := newPodLister()

	result, err := ListPersistentVolumeClaims(pvcLister, podLister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "pvc-1" {
		t.Errorf("Name = %q; want %q", result[0].Name, "pvc-1")
	}
}

func TestListPersistentVolumeClaims_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	pvc1 := makePVC("pvc-a", "ns-a")
	pvc2 := makePVC("pvc-b", "ns-b")
	pvcLister := newPVCLister(pvc1, pvc2)
	podLister := newPodLister()

	result, err := ListPersistentVolumeClaims(pvcLister, podLister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListPersistentVolumeClaims_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	pvcLister := newPVCLister()
	podLister := newPodLister()

	result, err := ListPersistentVolumeClaims(pvcLister, podLister, nil)
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

func TestListPersistentVolumeClaims_ErrorPropagation_PVCScope(t *testing.T) {
	sentinel := errors.New("pvc store unavailable")
	result, err := ListPersistentVolumeClaims(&errorPVCLister{err: sentinel}, newPodLister(), nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestToPersistentVolumeClaim_NilStorageClassName_IsDash(t *testing.T) {
	pvc := makePVC("pvc", "default")
	pvc.Spec.StorageClassName = nil

	got := toPersistentVolumeClaim(pvc, []string{})
	if got.StorageClass != "-" {
		t.Errorf("StorageClass = %q; want %q", got.StorageClass, "-")
	}
}

func TestToPersistentVolumeClaim_WithStorageClassName(t *testing.T) {
	pvc := makePVC("pvc", "default")
	storageClass := "fast-ssd"
	pvc.Spec.StorageClassName = &storageClass

	got := toPersistentVolumeClaim(pvc, []string{})
	if got.StorageClass != "fast-ssd" {
		t.Errorf("StorageClass = %q; want %q", got.StorageClass, "fast-ssd")
	}
}

func TestToPersistentVolumeClaim_NoPods_IsDash(t *testing.T) {
	pvc := makePVC("pvc", "default")

	got := toPersistentVolumeClaim(pvc, []string{})
	if got.Pods != "-" {
		t.Errorf("Pods = %q; want %q", got.Pods, "-")
	}
}

func TestToPersistentVolumeClaim_WithPods(t *testing.T) {
	pvc := makePVC("pvc", "default")

	got := toPersistentVolumeClaim(pvc, []string{"pod-1", "pod-2"})
	if got.Pods != "pod-1, pod-2" {
		t.Errorf("Pods = %q; want %q", got.Pods, "pod-1, pod-2")
	}
}

func TestToPersistentVolumeClaim_Terminating_StatusTerminating(t *testing.T) {
	pvc := makePVC("pvc", "default")
	now := metav1.Now()
	pvc.DeletionTimestamp = &now

	got := toPersistentVolumeClaim(pvc, []string{})
	if got.Status != "Terminating" {
		t.Errorf("Status = %q; want %q", got.Status, "Terminating")
	}
}

func TestGetPersistentVolumeClaimByName_Success(t *testing.T) {
	pvc := makePVC("pvc-1", "default")
	pvc.Labels = map[string]string{"app": "test"}
	pvcLister := newPVCLister(pvc)
	podLister := newPodLister()

	result, err := GetPersistentVolumeClaimByName(pvcLister, podLister, "default", "pvc-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.Name != "pvc-1" {
		t.Errorf("Name = %q; want %q", result.Name, "pvc-1")
	}
}

func TestGetPersistentVolumeClaimByName_NotFound(t *testing.T) {
	pvc := makePVC("pvc-1", "default")
	pvcLister := newPVCLister(pvc)
	podLister := newPodLister()

	_, err := GetPersistentVolumeClaimByName(pvcLister, podLister, "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent PVC; got nil")
	}
}

func TestGetPersistentVolumeClaimByName_NilSelector_EmptyMaps(t *testing.T) {
	pvc := makePVC("pvc-1", "default")
	pvc.Spec.Selector = nil
	pvcLister := newPVCLister(pvc)
	podLister := newPodLister()

	result, err := GetPersistentVolumeClaimByName(pvcLister, podLister, "default", "pvc-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.MatchLabels) != 0 {
		t.Errorf("MatchLabels length = %d; want 0", len(result.MatchLabels))
	}
	if len(result.MatchExprs) != 0 {
		t.Errorf("MatchExprs length = %d; want 0", len(result.MatchExprs))
	}
}

func TestGetPersistentVolumeClaimByName_WithSelector(t *testing.T) {
	pvc := makePVC("pvc-1", "default")
	pvc.Spec.Selector = &metav1.LabelSelector{
		MatchLabels: map[string]string{"app": "test"},
	}
	pvcLister := newPVCLister(pvc)
	podLister := newPodLister()

	result, err := GetPersistentVolumeClaimByName(pvcLister, podLister, "default", "pvc-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.MatchLabels) != 1 {
		t.Errorf("MatchLabels length = %d; want 1", len(result.MatchLabels))
	}
}

func TestGetPersistentVolumeClaimByName_NilPods_EmptySlice(t *testing.T) {
	pvc := makePVC("pvc-1", "default")
	pvcLister := newPVCLister(pvc)
	podLister := newPodLister()

	result, err := GetPersistentVolumeClaimByName(pvcLister, podLister, "default", "pvc-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Pods) != 0 {
		t.Errorf("Pods length = %d; want 0", len(result.Pods))
	}
}
