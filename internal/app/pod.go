package app

import (
	"context"
	"fmt"
	"log"

	"github.com/galacius/galacius/internal/kube"
	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListPods() ([]dto.Pod, error) {
	h, namespaces, mc := a.activeFactoryNamespacesAndMetrics()
	if !waitForResourceSyncIgnoringForbidden(h, "pods") {
		return []dto.Pod{}, nil
	}
	pods, err := kubeResources.ListPods(h.PodLister(), namespaces)
	if err != nil {
		log.Printf("app: ListPods: %v", err)
		return []dto.Pod{}, nil
	}
	if mc != nil {
		ctx, cancel := context.WithTimeout(context.Background(), metricsFetchTimeout)
		defer cancel()
		metricsNamespace := ""
		if len(namespaces) == 1 {
			metricsNamespace = namespaces[0]
		}
		usage := kube.FetchPodMetrics(ctx, mc, metricsNamespace)
		pods = kubeResources.ApplyPodMetrics(pods, usage)
	}
	return pods, nil
}

func (a *App) GetPodByName(namespace, name string) (dto.Pod, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "pods") {
		return dto.Pod{}, nil
	}
	result, err := kubeResources.GetPodByName(h.PodLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetPodByName: %v", err)
		return dto.Pod{}, nil
	}
	return result, nil
}

// WatchPodDetail registers the frontend's interest in live "pod:update"
// detail pushes for one specific Pod (namespace/name) — the one currently
// shown in the (single) open Pod detail drawer. Call UnwatchPodDetail on
// drawer close/unmount to stop. The "pods:update" list topic only ever
// carries the lean (detail=false) dto.Pod shape (see kubeResources.ListPods),
// so detail-only fields like ManagedFields would otherwise be silently wiped
// out by every list push while a drawer is open; this opt-in scoped topic
// carries the full detail=true shape instead.
func (a *App) WatchPodDetail(namespace, name string) {
	a.watchedPod.watch(namespace, name)
}

// UnwatchPodDetail reverses WatchPodDetail.
func (a *App) UnwatchPodDetail(namespace, name string) {
	a.watchedPod.unwatch(namespace, name)
}

// emitPodDetail pushes a fresh detail=true dto.Pod on "pod:update" (singular
// — distinct from the "pods:update" list topic) for the currently-watched
// Pod, if any. Mirrors emitSecretDetail: wired to run off the same
// informer-change signal as emitPods but kept independent of it.
func (a *App) emitPodDetail() {
	namespace, name, ok := a.watchedPod.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "pods") {
		return
	}
	detail, err := kubeResources.GetPodByName(h.PodLister(), namespace, name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("pod:update", func() any { return detail })
}

func (a *App) GetPodsSummary() (dto.PodSummary, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "pods") {
		return dto.PodSummary{}, nil
	}
	lister := h.PodLister()
	var pods []*corev1.Pod
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			log.Printf("app: GetPodsSummary: %v", err)
			return dto.PodSummary{}, nil
		}
		pods = all
	} else {
		for _, ns := range namespaces {
			nsPods, err := lister.Pods(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("app: GetPodsSummary: namespace %q: %v", ns, err)
				continue
			}
			pods = append(pods, nsPods...)
		}
	}
	return kubeResources.SummarizePods(pods), nil
}

func (a *App) emitPods() {
	a.emitPodsWithMetrics(nil)
}

// emitPodsWithMetrics emits a pod update filtered by the currently active namespace
// selection (a.activeNamespaces). If allMetrics is nil, metrics are fetched
// asynchronously to avoid blocking the initial emit.
func (a *App) emitPodsWithMetrics(allMetrics map[string]dto.PodUsage) {
	h, namespaces, mc := a.activeFactoryNamespacesAndMetrics()
	if !waitForResourceSyncIgnoringForbidden(h, "pods") {
		return
	}
	lister := h.PodLister()

	pods, err := kubeResources.ListPods(lister, namespaces)
	if err != nil {
		log.Printf("app: emitPods: %v", err)
		return
	}

	if allMetrics != nil {
		pods = kubeResources.ApplyPodMetrics(pods, allMetrics)
	}
	a.emitPump.Enqueue("pods:update", func() any { return pods })

	if allMetrics == nil && mc != nil {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), metricsFetchTimeout)
			defer cancel()
			metricsNamespace := ""
			if len(namespaces) == 1 {
				metricsNamespace = namespaces[0]
			}
			fetchedMetrics := kube.FetchPodMetrics(ctx, mc, metricsNamespace)
			if fetchedMetrics != nil {
				podsWithMetrics := kubeResources.ApplyPodMetrics(pods, fetchedMetrics)
				a.emitPump.Enqueue("pods:update", func() any { return podsWithMetrics })
			}
		}()
	}
}

// DeletePod deletes a Pod from the specified namespace.
func (a *App) DeletePod(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoreV1().Pods(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete Pod: %w", err)
	}

	a.emitPods()
	return nil
}

// DeletePods deletes multiple Pods, handling best-effort deletion across namespaces.
func (a *App) DeletePods(items []dto.PodRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.PodRef) string { return r.Namespace },
		func(r dto.PodRef) string { return r.Name },
		"pods",
		func(ctx context.Context, namespace, name string) error {
			return cs.CoreV1().Pods(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitPods()

	return err
}

func (a *App) GetPodYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	pod, err := cs.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get Pod: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(pod)
	if err != nil {
		return "", fmt.Errorf("marshal Pod to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdatePodYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var pod corev1.Pod
	err = sigsyaml.Unmarshal([]byte(yamlString), &pod)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to Pod: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().Pods(namespace).Update(ctx, &pod, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Pod: %w", err)
	}

	a.emitPods()

	return nil
}
