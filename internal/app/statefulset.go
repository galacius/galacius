package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) GetStatefulSetByName(namespace, name string) (dto.StatefulSet, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "statefulsets") {
		return dto.StatefulSet{}, nil
	}
	result, err := kubeResources.GetStatefulSetByName(h.StatefulSetLister(), namespace, name)
	if err != nil {
		return dto.StatefulSet{}, err
	}
	return result, nil
}

func (a *App) ListStatefulSets() ([]dto.StatefulSet, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "statefulsets") {
		return []dto.StatefulSet{}, nil
	}
	result, err := kubeResources.ListStatefulSets(h.StatefulSetLister(), namespaces)
	if err != nil {
		log.Printf("app: ListStatefulSets: %v", err)
		return []dto.StatefulSet{}, nil
	}
	return result, nil
}

func (a *App) GetStatefulSetsSummary() (dto.StatefulSetSummary, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "statefulsets") {
		return dto.StatefulSetSummary{}, nil
	}
	lister := h.StatefulSetLister()
	var sss []*appsv1.StatefulSet
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			log.Printf("app: GetStatefulSetsSummary: %v", err)
			return dto.StatefulSetSummary{}, nil
		}
		sss = all
	} else {
		for _, ns := range namespaces {
			nsStatefulSets, err := lister.StatefulSets(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("app: GetStatefulSetsSummary: namespace %q: %v", ns, err)
				continue
			}
			sss = append(sss, nsStatefulSets...)
		}
	}
	return kubeResources.SummarizeStatefulSets(sss), nil
}

// DeleteStatefulSet deletes a StatefulSet from the specified namespace.
func (a *App) DeleteStatefulSet(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.AppsV1().StatefulSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete StatefulSet: %w", err)
	}

	// Emit update event after successful delete
	a.emitStatefulSets()

	return nil
}

// DeleteStatefulSets deletes multiple StatefulSets, handling best-effort deletion across namespaces.
func (a *App) DeleteStatefulSets(items []dto.StatefulSetRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.StatefulSetRef) string { return r.Namespace },
		func(r dto.StatefulSetRef) string { return r.Name },
		"statefulsets",
		func(ctx context.Context, namespace, name string) error {
			return cs.AppsV1().StatefulSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitStatefulSets()

	return err
}

func (a *App) emitStatefulSets() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "statefulsets") {
		return
	}
	lister := h.StatefulSetLister()
	data, err := kubeResources.ListStatefulSets(lister, namespaces)
	if err != nil {
		log.Printf("app: emitStatefulSets: %v", err)
		return
	}
	a.emitPump.Enqueue("statefulsets:update", func() any { return data })
}

func (a *App) GetStatefulSetYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	ss, err := cs.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get StatefulSet: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(ss)
	if err != nil {
		return "", fmt.Errorf("marshal StatefulSet to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateStatefulSetYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var ss appsv1.StatefulSet
	err = sigsyaml.Unmarshal([]byte(yamlString), &ss)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to StatefulSet: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.AppsV1().StatefulSets(namespace).Update(ctx, &ss, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update StatefulSet: %w", err)
	}

	a.emitStatefulSets()

	return nil
}

// WatchStatefulSetDetail registers the frontend's interest in live "statefulset:update"
// detail pushes for one specific StatefulSet (namespace/name) — the one currently
// shown in the (single) open StatefulSet detail drawer. Call UnwatchStatefulSetDetail
// on drawer close/unmount to stop.
func (a *App) WatchStatefulSetDetail(namespace, name string) {
	a.watchedStatefulSet.watch(namespace, name)
}

// UnwatchStatefulSetDetail reverses WatchStatefulSetDetail.
func (a *App) UnwatchStatefulSetDetail(namespace, name string) {
	a.watchedStatefulSet.unwatch(namespace, name)
}

// emitStatefulSetDetail pushes a fresh detail on "statefulset:update" (singular — distinct from the
// "statefulsets:update" list topic) for the currently-watched StatefulSet, if any.
func (a *App) emitStatefulSetDetail() {
	namespace, name, ok := a.watchedStatefulSet.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "statefulsets") {
		return
	}
	detail, err := kubeResources.GetStatefulSetByName(h.StatefulSetLister(), namespace, name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("statefulset:update", func() any { return detail })
}
