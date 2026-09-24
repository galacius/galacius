package app

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/types"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListReplicaSets() ([]dto.ReplicaSet, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "replicasets") {
		return []dto.ReplicaSet{}, nil
	}
	result, err := kubeResources.ListReplicaSets(h.ReplicaSetLister(), namespaces)
	if err != nil {
		log.Printf("app: ListReplicaSets: %v", err)
		return []dto.ReplicaSet{}, nil
	}
	return result, nil
}

func (a *App) GetReplicaSetByName(namespace, name string) (dto.ReplicaSet, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "replicasets") {
		return dto.ReplicaSet{}, nil
	}
	result, err := kubeResources.GetReplicaSetByName(h.ReplicaSetLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetReplicaSetByName: %v", err)
		return dto.ReplicaSet{}, nil
	}
	return result, nil
}

func (a *App) GetReplicaSetsSummary() (dto.ReplicaSetSummary, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "replicasets") {
		return dto.ReplicaSetSummary{}, nil
	}
	lister := h.ReplicaSetLister()
	var rss []*appsv1.ReplicaSet
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			log.Printf("app: GetReplicaSetsSummary: %v", err)
			return dto.ReplicaSetSummary{}, nil
		}
		rss = all
	} else {
		for _, ns := range namespaces {
			nsRss, err := lister.ReplicaSets(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("app: GetReplicaSetsSummary: namespace %q: %v", ns, err)
				continue
			}
			rss = append(rss, nsRss...)
		}
	}
	return kubeResources.SummarizeReplicaSets(rss), nil
}

func (a *App) ScaleReplicaSet(namespace, name string, replicas int32) error {
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
	_, err = cs.AppsV1().ReplicaSets(namespace).Patch(
		ctx, name, types.MergePatchType, patchBytes, metav1.PatchOptions{},
	)
	return err
}

func (a *App) DeleteReplicaSet(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.AppsV1().ReplicaSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete ReplicaSet: %w", err)
	}

	a.emitReplicaSets()

	return nil
}

// DeleteReplicaSets deletes multiple ReplicaSets, handling best-effort deletion across namespaces.
func (a *App) DeleteReplicaSets(items []dto.ReplicaSetRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.ReplicaSetRef) string { return r.Namespace },
		func(r dto.ReplicaSetRef) string { return r.Name },
		"replicasets",
		func(ctx context.Context, namespace, name string) error {
			return cs.AppsV1().ReplicaSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitReplicaSets()

	return err
}

func (a *App) emitReplicaSets() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "replicasets") {
		return
	}
	lister := h.ReplicaSetLister()
	data, err := kubeResources.ListReplicaSets(lister, namespaces)
	if err != nil {
		log.Printf("app: emitReplicaSets: %v", err)
		return
	}
	a.emitPump.Enqueue("replicasets:update", func() any { return data })
}

func (a *App) GetReplicaSetYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	rs, err := cs.AppsV1().ReplicaSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get ReplicaSet: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(rs)
	if err != nil {
		return "", fmt.Errorf("marshal ReplicaSet to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateReplicaSetYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var rs appsv1.ReplicaSet
	err = sigsyaml.Unmarshal([]byte(yamlString), &rs)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to ReplicaSet: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.AppsV1().ReplicaSets(namespace).Update(ctx, &rs, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update ReplicaSet: %w", err)
	}

	a.emitReplicaSets()

	return nil
}

// WatchReplicaSetDetail registers the frontend's interest in live "replicaset:update"
// detail pushes for one specific ReplicaSet (namespace/name) — the one currently
// shown in the (single) open ReplicaSet detail drawer. Call UnwatchReplicaSetDetail
// on drawer close/unmount to stop.
func (a *App) WatchReplicaSetDetail(namespace, name string) {
	a.watchedReplicaSet.watch(namespace, name)
}

// UnwatchReplicaSetDetail reverses WatchReplicaSetDetail.
func (a *App) UnwatchReplicaSetDetail(namespace, name string) {
	a.watchedReplicaSet.unwatch(namespace, name)
}

// emitReplicaSetDetail pushes a fresh detail on "replicaset:update" (singular — distinct from the
// "replicasets:update" list topic) for the currently-watched ReplicaSet, if any.
func (a *App) emitReplicaSetDetail() {
	namespace, name, ok := a.watchedReplicaSet.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "replicasets") {
		return
	}
	detail, err := kubeResources.GetReplicaSetByName(h.ReplicaSetLister(), namespace, name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("replicaset:update", func() any { return detail })
}
