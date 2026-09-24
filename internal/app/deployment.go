package app

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/types"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListDeployments() ([]dto.Deployment, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "deployments") {
		return []dto.Deployment{}, nil
	}
	result, err := kubeResources.ListDeployments(h.DeploymentLister(), namespaces)
	if err != nil {
		log.Printf("app: ListDeployments: %v", err)
		return []dto.Deployment{}, nil
	}
	return result, nil
}

func (a *App) GetDeploymentByName(namespace, name string) (dto.Deployment, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "deployments") {
		return dto.Deployment{}, nil
	}
	result, err := kubeResources.GetDeploymentByName(h.DeploymentLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetDeploymentByName: %v", err)
		return dto.Deployment{}, nil
	}
	return result, nil
}

func (a *App) GetDeploymentsSummary() (dto.DeploymentSummary, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "deployments") {
		return dto.DeploymentSummary{}, nil
	}
	lister := h.DeploymentLister()
	var deps []*appsv1.Deployment
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			log.Printf("app: GetDeploymentsSummary: %v", err)
			return dto.DeploymentSummary{}, nil
		}
		deps = all
	} else {
		for _, ns := range namespaces {
			nsDeployments, err := lister.Deployments(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("app: GetDeploymentsSummary: namespace %q: %v", ns, err)
				continue
			}
			deps = append(deps, nsDeployments...)
		}
	}
	return kubeResources.SummarizeDeployments(deps), nil
}

func (a *App) RestartDeployment(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}
	patchBody := map[string]any{
		"spec": map[string]any{
			"template": map[string]any{
				"metadata": map[string]any{
					"annotations": map[string]any{
						"kubectl.kubernetes.io/restartedAt": time.Now().UTC().Format(time.RFC3339),
					},
				},
			},
		},
	}
	patchBytes, err := json.Marshal(patchBody)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.AppsV1().Deployments(namespace).Patch(
		ctx, name, types.MergePatchType, patchBytes, metav1.PatchOptions{},
	)
	return err
}

func (a *App) ScaleDeployment(namespace, name string, replicas int32) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}
	patchBody := map[string]any{
		"spec": map[string]any{"replicas": replicas},
	}
	patchBytes, err := json.Marshal(patchBody)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.AppsV1().Deployments(namespace).Patch(
		ctx, name, types.MergePatchType, patchBytes, metav1.PatchOptions{},
	)
	return err
}

func (a *App) DeleteDeployment(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.AppsV1().Deployments(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete Deployment: %w", err)
	}

	a.emitDeployments()

	return nil
}

// DeleteDeployments deletes multiple Deployments, handling best-effort deletion across namespaces.
func (a *App) DeleteDeployments(items []dto.DeploymentRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.DeploymentRef) string { return r.Namespace },
		func(r dto.DeploymentRef) string { return r.Name },
		"deployments",
		func(ctx context.Context, namespace, name string) error {
			return cs.AppsV1().Deployments(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitDeployments()

	return err
}

func (a *App) emitDeployments() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "deployments") {
		return
	}
	lister := h.DeploymentLister()
	data, err := kubeResources.ListDeployments(lister, namespaces)
	if err != nil {
		log.Printf("app: emitDeployments: %v", err)
		return
	}
	a.emitPump.Enqueue("deployments:update", func() any { return data })
}

func (a *App) GetDeploymentYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	dep, err := cs.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get Deployment: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(dep)
	if err != nil {
		return "", fmt.Errorf("marshal Deployment to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateDeploymentYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var dep appsv1.Deployment
	err = sigsyaml.Unmarshal([]byte(yamlString), &dep)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to Deployment: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.AppsV1().Deployments(namespace).Update(ctx, &dep, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Deployment: %w", err)
	}

	a.emitDeployments()

	return nil
}

// WatchDeploymentDetail registers the frontend's interest in live "deployment:update"
// detail pushes for one specific Deployment (namespace/name) — the one currently
// shown in the (single) open Deployment detail drawer. Call UnwatchDeploymentDetail
// on drawer close/unmount to stop.
func (a *App) WatchDeploymentDetail(namespace, name string) {
	a.watchedDeployment.watch(namespace, name)
}

// UnwatchDeploymentDetail reverses WatchDeploymentDetail.
func (a *App) UnwatchDeploymentDetail(namespace, name string) {
	a.watchedDeployment.unwatch(namespace, name)
}

// emitDeploymentDetail pushes a fresh detail on "deployment:update" (singular — distinct from the
// "deployments:update" list topic) for the currently-watched Deployment, if any.
func (a *App) emitDeploymentDetail() {
	namespace, name, ok := a.watchedDeployment.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "deployments") {
		return
	}
	detail, err := kubeResources.GetDeploymentByName(h.DeploymentLister(), namespace, name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("deployment:update", func() any { return detail })
}
