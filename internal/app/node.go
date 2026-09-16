package app

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/galacius/galacius/internal/kube"
	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	corev1 "k8s.io/api/core/v1"
	policyv1 "k8s.io/api/policy/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) GetNodeByName(name string) (dto.Node, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "nodes") {
		return dto.Node{}, nil
	}
	result, err := kubeResources.GetNodeByName(h.Factory.Core().V1().Nodes().Lister(), name)
	if err != nil {
		log.Printf("app: GetNodeByName: %v", err)
		return dto.Node{}, nil
	}
	return result, nil
}

func (a *App) ListNodes() ([]dto.Node, error) {
	h, mc := a.activeFactoryAndMetrics()
	if !waitForResourceSync(h, "nodes") {
		return []dto.Node{}, nil
	}
	nodes, err := kubeResources.ListNodes(h.Factory.Core().V1().Nodes().Lister())
	if err != nil {
		log.Printf("app: ListNodes: %v", err)
		return []dto.Node{}, nil
	}
	if mc != nil {
		ctx, cancel := context.WithTimeout(context.Background(), metricsFetchTimeout)
		defer cancel()
		nodes = kubeResources.ApplyNodeMetrics(nodes, kube.FetchNodeMetrics(ctx, mc))
	}
	return nodes, nil
}

func (a *App) emitNodes() {
	h, mc := a.activeFactoryAndMetrics()
	if !waitForResourceSync(h, "nodes") {
		return
	}
	nodes, err := kubeResources.ListNodes(h.Factory.Core().V1().Nodes().Lister())
	if err != nil {
		log.Printf("app: emitNodes: %v", err)
		return
	}
	if mc != nil {
		ctx, cancel := context.WithTimeout(context.Background(), metricsFetchTimeout)
		defer cancel()
		nodes = kubeResources.ApplyNodeMetrics(nodes, kube.FetchNodeMetrics(ctx, mc))
	}
	runtime.EventsEmit(a.ctx, "nodes:update", nodes)
}

func (a *App) DeleteNode(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoreV1().Nodes().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete Node: %w", err)
	}

	a.emitNodes()

	return nil
}

func (a *App) DeleteNodes(names []string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(names,
		nil,
		func(name string) string { return name },
		"nodes",
		func(ctx context.Context, _, name string) error {
			return cs.CoreV1().Nodes().Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitNodes()

	return err
}

func (a *App) GetNodeYAML(name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	node, err := cs.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get Node: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(node)
	if err != nil {
		return "", fmt.Errorf("marshal Node to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateNodeYAML(yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var node corev1.Node
	err = sigsyaml.Unmarshal([]byte(yamlString), &node)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to Node: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().Nodes().Update(ctx, &node, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Node: %w", err)
	}

	a.emitNodes()

	return nil
}

func (a *App) CordonNode(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	node, err := cs.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
	cancel()
	if err != nil {
		return fmt.Errorf("get Node: %w", err)
	}

	node.Spec.Unschedulable = true
	ctx, cancel = context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Node: %w", err)
	}

	a.emitNodes()
	return nil
}

func (a *App) UncordonNode(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	node, err := cs.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
	cancel()
	if err != nil {
		return fmt.Errorf("get Node: %w", err)
	}

	node.Spec.Unschedulable = false
	ctx, cancel = context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Node: %w", err)
	}

	a.emitNodes()
	return nil
}

func (a *App) DrainNode(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	// Step 1: Cordon the node
	if err := a.CordonNode(name); err != nil {
		return fmt.Errorf("cordon Node: %w", err)
	}

	// Step 2: List all pods on the node
	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	pods, err := cs.CoreV1().Pods("").List(ctx, metav1.ListOptions{
		FieldSelector: "spec.nodeName=" + name,
	})
	cancel()
	if err != nil {
		return fmt.Errorf("list Pods: %w", err)
	}

	// Step 3: Filter pods that should NOT be evicted
	var podsToEvict []*corev1.Pod
	for i := range pods.Items {
		pod := &pods.Items[i]

		// Skip DaemonSet-managed pods
		isDaemonSetPod := false
		for _, owner := range pod.OwnerReferences {
			if owner.Kind == "DaemonSet" {
				isDaemonSetPod = true
				break
			}
		}
		if isDaemonSetPod {
			continue
		}

		// Skip mirror/static pods
		if _, hasMirrorAnnotation := pod.Annotations["kubernetes.io/config.mirror"]; hasMirrorAnnotation {
			continue
		}

		// Skip pods already in terminal state
		if pod.Status.Phase == corev1.PodSucceeded || pod.Status.Phase == corev1.PodFailed {
			continue
		}

		podsToEvict = append(podsToEvict, pod)
	}

	// Step 4: Evict remaining pods via Eviction API
	var msgs []string
	for _, pod := range podsToEvict {
		eviction := &policyv1.Eviction{
			ObjectMeta: metav1.ObjectMeta{
				Name:      pod.Name,
				Namespace: pod.Namespace,
			},
		}
		ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
		err := cs.PolicyV1().Evictions(pod.Namespace).Evict(ctx, eviction)
		cancel()
		if err != nil {
			msgs = append(msgs, fmt.Sprintf("%s/%s: %v", pod.Namespace, pod.Name, err))
		}
	}

	// Step 5: Emit update event
	a.emitNodes()

	// Step 6: Return aggregated error or nil
	if len(msgs) > 0 {
		return fmt.Errorf("failed to evict %d of %d pods: %s", len(msgs), len(podsToEvict), strings.Join(msgs, "; "))
	}
	return nil
}

// WatchNodeDetail registers the frontend's interest in live "node:update"
// detail pushes for one specific Node (name) — the one currently shown in
// the (single) open Node detail drawer. Call UnwatchNodeDetail on
// drawer close/unmount to stop.
func (a *App) WatchNodeDetail(name string) {
	a.watchedNode.watch("", name)
}

// UnwatchNodeDetail reverses WatchNodeDetail.
func (a *App) UnwatchNodeDetail(name string) {
	a.watchedNode.unwatch("", name)
}

// emitNodeDetail pushes a fresh Node detail on "node:update" (singular
// — distinct from the "nodes:update" list topic) for the currently-watched
// Node, if any.
func (a *App) emitNodeDetail() {
	_, name, ok := a.watchedNode.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSync(h, "nodes") {
		return
	}
	detail, err := kubeResources.GetNodeByName(h.Factory.Core().V1().Nodes().Lister(), name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "node:update", detail)
}
