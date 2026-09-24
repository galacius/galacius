package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	policyv1 "k8s.io/api/policy/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListPodDisruptionBudgets() ([]dto.PodDisruptionBudget, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "pdbs") {
		return []dto.PodDisruptionBudget{}, nil
	}
	result, err := kubeResources.ListPodDisruptionBudgets(h.PodDisruptionBudgetLister(), namespaces)
	if err != nil {
		log.Printf("app: ListPodDisruptionBudgets: %v", err)
		return []dto.PodDisruptionBudget{}, nil
	}
	return result, nil
}

func (a *App) WatchPodDisruptionBudgetDetail(namespace, name string) {
	a.watchedPodDisruptionBudget.watch(namespace, name)
}

func (a *App) UnwatchPodDisruptionBudgetDetail(namespace, name string) {
	a.watchedPodDisruptionBudget.unwatch(namespace, name)
}

func (a *App) emitPodDisruptionBudgetDetail() {
	namespace, name, ok := a.watchedPodDisruptionBudget.get()
	if !ok {
		return
	}
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "pdbs") {
		return
	}
	detail, err := kubeResources.GetPodDisruptionBudgetByName(h.PodDisruptionBudgetLister(), namespace, name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("pdb:update", func() any { return detail })
}

func (a *App) GetPodDisruptionBudgetByName(namespace, name string) (*dto.PodDisruptionBudgetDetail, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "pdbs") {
		return &dto.PodDisruptionBudgetDetail{}, nil
	}
	result, err := kubeResources.GetPodDisruptionBudgetByName(
		h.PodDisruptionBudgetLister(),
		namespace,
		name,
	)
	if err != nil {
		log.Printf("app: GetPodDisruptionBudgetByName: %v", err)
		return &dto.PodDisruptionBudgetDetail{}, nil
	}
	return result, nil
}

func (a *App) emitPodDisruptionBudgets() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "pdbs") {
		return
	}
	lister := h.PodDisruptionBudgetLister()
	data, err := kubeResources.ListPodDisruptionBudgets(lister, namespaces)
	if err != nil {
		log.Printf("app: emitPodDisruptionBudgets: %v", err)
		return
	}
	a.emitPump.Enqueue("pdbs:update", func() any { return data })
}

// DeletePodDisruptionBudget deletes a PodDisruptionBudget from the specified namespace.
func (a *App) DeletePodDisruptionBudget(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.PolicyV1().PodDisruptionBudgets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete PodDisruptionBudget: %w", err)
	}

	// Emit update event after successful delete
	a.emitPodDisruptionBudgets()

	return nil
}

// DeletePodDisruptionBudgets deletes multiple PodDisruptionBudgets, handling best-effort deletion across namespaces.
func (a *App) DeletePodDisruptionBudgets(items []dto.PodDisruptionBudgetRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.PodDisruptionBudgetRef) string { return r.Namespace },
		func(r dto.PodDisruptionBudgetRef) string { return r.Name },
		"poddisruptionbudgets",
		func(ctx context.Context, namespace, name string) error {
			return cs.PolicyV1().PodDisruptionBudgets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitPodDisruptionBudgets()

	return err
}

func (a *App) GetPDBYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	pdb, err := cs.PolicyV1().PodDisruptionBudgets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get PodDisruptionBudget: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(pdb)
	if err != nil {
		return "", fmt.Errorf("marshal PodDisruptionBudget to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdatePDBYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var pdb policyv1.PodDisruptionBudget
	err = sigsyaml.Unmarshal([]byte(yamlString), &pdb)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to PodDisruptionBudget: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.PolicyV1().PodDisruptionBudgets(namespace).Update(ctx, &pdb, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update PodDisruptionBudget: %w", err)
	}

	a.emitPodDisruptionBudgets()

	return nil
}
