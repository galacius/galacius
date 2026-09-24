package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

// WatchPersistentVolumeClaimDetail registers the frontend's interest in live
// "pvc:update" detail pushes for one specific PersistentVolumeClaim
// (namespace/name) — the one currently shown in the (single) open PVC
// detail drawer. Call UnwatchPersistentVolumeClaimDetail on drawer
// close/unmount to stop.
func (a *App) WatchPersistentVolumeClaimDetail(namespace, name string) {
	a.watchedPersistentVolumeClaim.watch(namespace, name)
}

// UnwatchPersistentVolumeClaimDetail reverses WatchPersistentVolumeClaimDetail.
func (a *App) UnwatchPersistentVolumeClaimDetail(namespace, name string) {
	a.watchedPersistentVolumeClaim.unwatch(namespace, name)
}

// emitPersistentVolumeClaimDetail pushes a fresh dto.PersistentVolumeClaimDetail
// on "pvc:update" (singular — distinct from the "pvcs:update" list topic) for
// the currently-watched PersistentVolumeClaim, if any. Mirrors
// emitPersistentVolumeClaims but is intentionally not called from within it:
// it's wired to run off the same informer-change signal independently, so
// detail-route consumers aren't coupled to the list emit path.
func (a *App) emitPersistentVolumeClaimDetail() {
	namespace, name, ok := a.watchedPersistentVolumeClaim.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "pvcs") {
		return
	}
	detail, err := kubeResources.GetPersistentVolumeClaimByName(h.PersistentVolumeClaimLister(), h.PodLister(), namespace, name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("pvc:update", func() any { return detail })
}

func (a *App) ListPersistentVolumeClaims() ([]dto.PersistentVolumeClaim, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "pvcs") {
		return []dto.PersistentVolumeClaim{}, nil
	}
	result, err := kubeResources.ListPersistentVolumeClaims(
		h.PersistentVolumeClaimLister(),
		h.PodLister(),
		namespaces,
	)
	if err != nil {
		log.Printf("app: ListPersistentVolumeClaims: %v", err)
		return []dto.PersistentVolumeClaim{}, nil
	}
	return result, nil
}

func (a *App) GetPersistentVolumeClaimByName(namespace, name string) (*dto.PersistentVolumeClaimDetail, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "pvcs") {
		return &dto.PersistentVolumeClaimDetail{}, nil
	}
	result, err := kubeResources.GetPersistentVolumeClaimByName(
		h.PersistentVolumeClaimLister(),
		h.PodLister(),
		namespace,
		name,
	)
	if err != nil {
		log.Printf("app: GetPersistentVolumeClaimByName: %v", err)
		return &dto.PersistentVolumeClaimDetail{}, nil
	}
	return result, nil
}

func (a *App) emitPersistentVolumeClaims() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "pvcs") {
		return
	}
	pvcLister := h.PersistentVolumeClaimLister()
	podLister := h.PodLister()
	data, err := kubeResources.ListPersistentVolumeClaims(pvcLister, podLister, namespaces)
	if err != nil {
		log.Printf("app: emitPersistentVolumeClaims: %v", err)
		return
	}
	a.emitPump.Enqueue("pvcs:update", func() any { return data })
}

// DeletePersistentVolumeClaim deletes a PersistentVolumeClaim from the specified namespace.
func (a *App) DeletePersistentVolumeClaim(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoreV1().PersistentVolumeClaims(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete PersistentVolumeClaim: %w", err)
	}

	a.emitPersistentVolumeClaims()

	return nil
}

// DeletePersistentVolumeClaims deletes multiple PersistentVolumeClaims, handling best-effort deletion across namespaces.
func (a *App) DeletePersistentVolumeClaims(items []dto.PersistentVolumeClaimRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.PersistentVolumeClaimRef) string { return r.Namespace },
		func(r dto.PersistentVolumeClaimRef) string { return r.Name },
		"persistentvolumeclaims",
		func(ctx context.Context, namespace, name string) error {
			return cs.CoreV1().PersistentVolumeClaims(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitPersistentVolumeClaims()

	return err
}

func (a *App) GetPersistentVolumeClaimYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	pvc, err := cs.CoreV1().PersistentVolumeClaims(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get PersistentVolumeClaim: %w", err)
	}

	b, err := sigsyaml.Marshal(pvc)
	if err != nil {
		return "", fmt.Errorf("marshal PersistentVolumeClaim: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdatePersistentVolumeClaimYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var pvc corev1.PersistentVolumeClaim
	err = sigsyaml.Unmarshal([]byte(yamlString), &pvc)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to PersistentVolumeClaim: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().PersistentVolumeClaims(namespace).Update(ctx, &pvc, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update PersistentVolumeClaim: %w", err)
	}

	a.emitPersistentVolumeClaims()

	return nil
}
