package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	schedulingv1 "k8s.io/api/scheduling/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) GetPriorityClassByName(name string) (dto.PriorityClass, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "priorityclasses") {
		return dto.PriorityClass{}, nil
	}
	result, err := kubeResources.GetPriorityClassByName(
		h.Factory.Scheduling().V1().PriorityClasses().Lister(),
		name,
	)
	if err != nil {
		log.Printf("app: GetPriorityClassByName: %v", err)
		return dto.PriorityClass{}, nil
	}
	return result, nil
}

func (a *App) ListPriorityClasses() ([]dto.PriorityClass, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "priorityclasses") {
		return []dto.PriorityClass{}, nil
	}
	result, err := kubeResources.ListPriorityClasses(
		h.Factory.Scheduling().V1().PriorityClasses().Lister(),
	)
	if err != nil {
		log.Printf("app: ListPriorityClasses: %v", err)
		return []dto.PriorityClass{}, nil
	}
	return result, nil
}

func (a *App) DeletePriorityClass(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.SchedulingV1().PriorityClasses().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete PriorityClass: %w", err)
	}

	a.emitPriorityClasses()

	return nil
}

func (a *App) DeletePriorityClasses(items []dto.PriorityClassRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		nil,
		func(r dto.PriorityClassRef) string { return r.Name },
		"priorityclasses",
		func(ctx context.Context, _, name string) error {
			return cs.SchedulingV1().PriorityClasses().Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitPriorityClasses()

	return err
}

func (a *App) emitPriorityClasses() {
	h := a.activeFactory()
	if !waitForResourceSync(h, "priorityclasses") {
		return
	}
	data, err := kubeResources.ListPriorityClasses(
		h.Factory.Scheduling().V1().PriorityClasses().Lister(),
	)
	if err != nil {
		log.Printf("app: emitPriorityClasses: %v", err)
		return
	}
	a.emitPump.Enqueue("priorityclasses:update", func() any { return data })
}

func (a *App) GetPriorityClassYAML(name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	pc, err := cs.SchedulingV1().PriorityClasses().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get PriorityClass: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(pc)
	if err != nil {
		return "", fmt.Errorf("marshal PriorityClass to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdatePriorityClassYAML(yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var pc schedulingv1.PriorityClass
	err = sigsyaml.Unmarshal([]byte(yamlString), &pc)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to PriorityClass: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.SchedulingV1().PriorityClasses().Update(ctx, &pc, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update PriorityClass: %w", err)
	}

	a.emitPriorityClasses()

	return nil
}
