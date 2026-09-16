package app

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/types"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListDaemonSets() ([]dto.DaemonSet, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "daemonsets") {
		return []dto.DaemonSet{}, nil
	}
	result, err := kubeResources.ListDaemonSets(h.DaemonSetLister(), namespaces)
	if err != nil {
		log.Printf("app: ListDaemonSets: %v", err)
		return []dto.DaemonSet{}, nil
	}
	return result, nil
}

func (a *App) GetDaemonSetByName(namespace, name string) (dto.DaemonSet, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "daemonsets") {
		return dto.DaemonSet{}, nil
	}
	result, err := kubeResources.GetDaemonSetByName(h.DaemonSetLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetDaemonSetByName: %v", err)
		return dto.DaemonSet{}, nil
	}
	return result, nil
}

func (a *App) GetDaemonSetsSummary() (dto.DaemonSetSummary, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "daemonsets") {
		return dto.DaemonSetSummary{}, nil
	}
	lister := h.DaemonSetLister()
	var dss []*appsv1.DaemonSet
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			log.Printf("app: GetDaemonSetsSummary: %v", err)
			return dto.DaemonSetSummary{}, nil
		}
		dss = all
	} else {
		for _, ns := range namespaces {
			nsDaemonSets, err := lister.DaemonSets(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("app: GetDaemonSetsSummary: namespace %q: %v", ns, err)
				continue
			}
			dss = append(dss, nsDaemonSets...)
		}
	}
	return kubeResources.SummarizeDaemonSets(dss), nil
}

func (a *App) RestartDaemonSet(namespace, name string) error {
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
	_, err = cs.AppsV1().DaemonSets(namespace).Patch(
		ctx, name, types.MergePatchType, patchBytes, metav1.PatchOptions{},
	)
	return err
}

func (a *App) DeleteDaemonSet(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.AppsV1().DaemonSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete DaemonSet: %w", err)
	}

	a.emitDaemonSets()

	return nil
}

// DeleteDaemonSets deletes multiple DaemonSets, handling best-effort deletion across namespaces.
func (a *App) DeleteDaemonSets(items []dto.DaemonSetRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.DaemonSetRef) string { return r.Namespace },
		func(r dto.DaemonSetRef) string { return r.Name },
		"daemonsets",
		func(ctx context.Context, namespace, name string) error {
			return cs.AppsV1().DaemonSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitDaemonSets()

	return err
}

func (a *App) emitDaemonSets() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "daemonsets") {
		return
	}
	lister := h.DaemonSetLister()
	data, err := kubeResources.ListDaemonSets(lister, namespaces)
	if err != nil {
		log.Printf("app: emitDaemonSets: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "daemonsets:update", data)
}

func (a *App) GetDaemonSetYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	ds, err := cs.AppsV1().DaemonSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get DaemonSet: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(ds)
	if err != nil {
		return "", fmt.Errorf("marshal DaemonSet to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateDaemonSetYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var ds appsv1.DaemonSet
	err = sigsyaml.Unmarshal([]byte(yamlString), &ds)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to DaemonSet: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.AppsV1().DaemonSets(namespace).Update(ctx, &ds, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update DaemonSet: %w", err)
	}

	a.emitDaemonSets()

	return nil
}

// WatchDaemonSetDetail registers the frontend's interest in live "daemonset:update"
// detail pushes for one specific DaemonSet (namespace/name) — the one currently
// shown in the (single) open DaemonSet detail drawer. Call UnwatchDaemonSetDetail
// on drawer close/unmount to stop.
func (a *App) WatchDaemonSetDetail(namespace, name string) {
	a.watchedDaemonSet.watch(namespace, name)
}

// UnwatchDaemonSetDetail reverses WatchDaemonSetDetail.
func (a *App) UnwatchDaemonSetDetail(namespace, name string) {
	a.watchedDaemonSet.unwatch(namespace, name)
}

// emitDaemonSetDetail pushes a fresh detail on "daemonset:update" (singular — distinct from the
// "daemonsets:update" list topic) for the currently-watched DaemonSet, if any.
func (a *App) emitDaemonSetDetail() {
	namespace, name, ok := a.watchedDaemonSet.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "daemonsets") {
		return
	}
	detail, err := kubeResources.GetDaemonSetByName(h.DaemonSetLister(), namespace, name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "daemonset:update", detail)
}
