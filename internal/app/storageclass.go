package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListStorageClasses() ([]dto.StorageClass, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "storageclasses") {
		return []dto.StorageClass{}, nil
	}
	result, err := kubeResources.ListStorageClasses(
		h.Factory.Storage().V1().StorageClasses().Lister(),
	)
	if err != nil {
		log.Printf("app: ListStorageClasses: %v", err)
		return []dto.StorageClass{}, nil
	}
	return result, nil
}

func (a *App) GetStorageClassByName(name string) (dto.StorageClass, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "storageclasses") {
		return dto.StorageClass{}, nil
	}
	result, err := kubeResources.GetStorageClassByName(h.Factory.Storage().V1().StorageClasses().Lister(), name)
	if err != nil {
		log.Printf("app: GetStorageClassByName: %v", err)
		return dto.StorageClass{}, nil
	}
	return result, nil
}

func (a *App) emitStorageClasses() {
	h := a.activeFactory()
	if !waitForResourceSync(h, "storageclasses") {
		return
	}
	data, err := kubeResources.ListStorageClasses(
		h.Factory.Storage().V1().StorageClasses().Lister(),
	)
	if err != nil {
		log.Printf("app: emitStorageClasses: %v", err)
		return
	}
	a.emitPump.Enqueue("storageclasses:update", func() any { return data })
}

// DeleteStorageClass deletes a StorageClass.
func (a *App) DeleteStorageClass(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.StorageV1().StorageClasses().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete StorageClass: %w", err)
	}

	a.emitStorageClasses()

	return nil
}

// DeleteStorageClasses deletes multiple StorageClasses.
func (a *App) DeleteStorageClasses(items []dto.StorageClassRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		nil,
		func(r dto.StorageClassRef) string { return r.Name },
		"storageclasses",
		func(ctx context.Context, _, name string) error {
			return cs.StorageV1().StorageClasses().Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitStorageClasses()

	return err
}

func (a *App) GetStorageClassYAML(name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	sc, err := cs.StorageV1().StorageClasses().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get StorageClass: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(sc)
	if err != nil {
		return "", fmt.Errorf("marshal StorageClass to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateStorageClassYAML(yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var sc storagev1.StorageClass
	err = sigsyaml.Unmarshal([]byte(yamlString), &sc)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to StorageClass: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.StorageV1().StorageClasses().Update(ctx, &sc, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update StorageClass: %w", err)
	}

	a.emitStorageClasses()

	return nil
}
