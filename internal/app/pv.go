package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListPersistentVolumes() ([]dto.PersistentVolume, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "pvs") {
		return []dto.PersistentVolume{}, nil
	}
	result, err := kubeResources.ListPersistentVolumes(
		h.Factory.Core().V1().PersistentVolumes().Lister(),
	)
	if err != nil {
		log.Printf("app: ListPersistentVolumes: %v", err)
		return []dto.PersistentVolume{}, nil
	}
	return result, nil
}

func (a *App) emitPersistentVolumes() {
	h := a.activeFactory()
	if !waitForResourceSync(h, "pvs") {
		return
	}
	data, err := kubeResources.ListPersistentVolumes(
		h.Factory.Core().V1().PersistentVolumes().Lister(),
	)
	if err != nil {
		log.Printf("app: emitPersistentVolumes: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "pvs:update", data)
}

// DeletePersistentVolume deletes a PersistentVolume.
func (a *App) DeletePersistentVolume(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoreV1().PersistentVolumes().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete PersistentVolume: %w", err)
	}

	a.emitPersistentVolumes()

	return nil
}

// DeletePersistentVolumes deletes multiple PersistentVolumes.
func (a *App) DeletePersistentVolumes(items []dto.PersistentVolumeRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		nil,
		func(r dto.PersistentVolumeRef) string { return r.Name },
		"persistentvolumes",
		func(ctx context.Context, _, name string) error {
			return cs.CoreV1().PersistentVolumes().Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitPersistentVolumes()

	return err
}

func (a *App) GetPersistentVolumeYAML(name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	pv, err := cs.CoreV1().PersistentVolumes().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get PersistentVolume: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(pv)
	if err != nil {
		return "", fmt.Errorf("marshal PersistentVolume to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdatePersistentVolumeYAML(yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var pv corev1.PersistentVolume
	err = sigsyaml.Unmarshal([]byte(yamlString), &pv)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to PersistentVolume: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().PersistentVolumes().Update(ctx, &pv, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update PersistentVolume: %w", err)
	}

	a.emitPersistentVolumes()

	return nil
}
