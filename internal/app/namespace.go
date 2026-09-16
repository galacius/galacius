package app

import (
	"context"
	"fmt"
	"log"

	"github.com/galacius/galacius/internal/kube"
	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListNamespaces() ([]dto.Namespace, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "namespaces") {
		return []dto.Namespace{}, nil
	}
	result, err := kubeResources.ListNamespaces(h.Factory.Core().V1().Namespaces().Lister())
	if err != nil {
		log.Printf("app: ListNamespaces: %v", err)
		return []dto.Namespace{}, nil
	}
	return result, nil
}

func (a *App) GetNamespaceByName(name string) (dto.Namespace, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "namespaces") {
		return dto.Namespace{}, nil
	}
	result, err := kubeResources.GetNamespaceByName(h.Factory.Core().V1().Namespaces().Lister(), name)
	if err != nil {
		log.Printf("app: GetNamespaceByName: %v", err)
		return dto.Namespace{}, nil
	}
	return result, nil
}

func (a *App) emitNamespaces() {
	h := a.activeFactory()
	if !waitForResourceSync(h, "namespaces") {
		return
	}
	data, err := kubeResources.ListNamespaces(h.Factory.Core().V1().Namespaces().Lister())
	if err != nil {
		log.Printf("app: emitNamespaces: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "namespaces:update", data)
}

// GetNamespaces returns the list of namespace names for use in the UI selector.
func (a *App) GetNamespaces() ([]string, error) {
	nsDTOs, err := a.ListNamespaces()
	if err != nil {
		return nil, err
	}
	names := make([]string, len(nsDTOs))
	for i, ns := range nsDTOs {
		names[i] = ns.Name
	}
	return names, nil
}

// GetNamespacesForContext returns namespace names for an arbitrary context via a
// direct (non-cached) API call, independent of whether that context is currently
// connected — unlike GetNamespaces, which only serves the active connected context
// from its informer cache.
func (a *App) GetNamespacesForContext(contextName string) ([]string, error) {
	a.mu.RLock()
	proxy := a.settings.ClusterProxies[contextName]
	kubeconfigPaths := a.settings.KubeconfigPaths
	a.mu.RUnlock()

	cs, _, err := kube.NewClientset(contextName, proxy.HttpProxy, proxy.HttpsProxy, kubeconfigPaths)
	if err != nil {
		return nil, err
	}
	list, err := cs.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	names := make([]string, 0, len(list.Items))
	for _, ns := range list.Items {
		names = append(names, ns.Name)
	}
	return names, nil
}

func (a *App) DeleteNamespace(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete Namespace: %w", err)
	}

	a.emitNamespaces()

	return nil
}

func (a *App) DeleteNamespaces(names []string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(names,
		nil,
		func(name string) string { return name },
		"namespaces",
		func(ctx context.Context, _, name string) error {
			return cs.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitNamespaces()

	return err
}

func (a *App) CreateNamespace(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
	return err
}

func (a *App) GetNamespaceYAML(name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	ns, err := cs.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get Namespace: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(ns)
	if err != nil {
		return "", fmt.Errorf("marshal Namespace to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateNamespaceYAML(yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var ns corev1.Namespace
	err = sigsyaml.Unmarshal([]byte(yamlString), &ns)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to Namespace: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().Namespaces().Update(ctx, &ns, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Namespace: %w", err)
	}

	a.emitNamespaces()

	return nil
}

// SetActiveNamespaces updates the active namespace filter. seq is a value the
// frontend increments synchronously on every call (before the async Wails IPC
// dispatch), letting us detect calls that arrive out of order: two rapid
// selection changes can reach this method in either order over the IPC
// bridge, since Wails gives no ordering guarantee between concurrent calls to
// the same bound method. Without seq, whichever call happens to arrive last
// wins — even if it was the user's earlier (now-stale) selection — silently
// reverting a newer choice. A call with seq <= the highest seq already
// applied is dropped as stale.
func (a *App) SetActiveNamespaces(namespaces []string, seq int64) error {
	a.mu.Lock()
	if seq <= a.activeNamespacesSeq {
		a.mu.Unlock()
		return nil
	}
	a.activeNamespacesSeq = seq
	a.activeNamespaces = namespaces
	h := a.factories[a.activeContext]
	a.mu.Unlock()

	// Rescope the nsscope-managed informer(s) to the new namespace filter
	// before emitting, so the emit calls below read from listers already
	// scoped to match (or from the cache while it's still warming, same as
	// every other resource's emit path). See FactoryHandle.RescopePods.
	if h != nil {
		h.RescopePods(namespaces)
		h.RescopeDeployments(namespaces)
		h.RescopeDaemonSets(namespaces)
		h.RescopeStatefulSets(namespaces)
		h.RescopeReplicaSets(namespaces)
		h.RescopeJobs(namespaces)
		h.RescopeCronJobs(namespaces)
		h.RescopeConfigMaps(namespaces)
		h.RescopeSecrets(namespaces)
		h.RescopeResourceQuotas(namespaces)
		h.RescopeLimitRanges(namespaces)
		h.RescopeHorizontalPodAutoscalers(namespaces)
		h.RescopePodDisruptionBudgets(namespaces)
		h.RescopeLeases(namespaces)
		h.RescopeServices(namespaces)
		h.RescopeEndpointSlices(namespaces)
		h.RescopeEndpoints(namespaces)
		h.RescopeIngresses(namespaces)
		h.RescopeNetworkPolicies(namespaces)
		h.RescopePersistentVolumeClaims(namespaces)
		h.RescopeServiceAccounts(namespaces)
		h.RescopeRoles(namespaces)
		h.RescopeRoleBindings(namespaces)
		h.RescopeEvents(namespaces)
	}

	a.emitActiveNamespacesToPlugins(namespaces)

	a.emitPods()
	a.emitEvents()
	a.emitLeases()
	a.emitEndpoints()
	a.emitEndpointSlices()
	a.emitDeployments()
	a.emitDaemonSets()
	a.emitReplicaSets()
	a.emitStatefulSets()
	a.emitJobs()
	a.emitCronJobs()
	a.emitConfigMaps()
	a.emitSecrets()
	a.emitResourceQuotas()
	a.emitLimitRanges()
	a.emitHPAs()
	a.emitPodDisruptionBudgets()
	a.emitIngresses()
	a.emitNetworkPolicies()
	a.emitPersistentVolumeClaims()
	a.emitServices()
	a.emitServiceAccounts()
	a.emitRoles()
	a.emitRoleBindings()
	return nil
}

// WatchNamespaceDetail registers the frontend's interest in live "namespace:update"
// detail pushes for one specific Namespace (name) — the one currently shown in
// the (single) open Namespace detail drawer. Call UnwatchNamespaceDetail on
// drawer close/unmount to stop.
func (a *App) WatchNamespaceDetail(name string) {
	a.watchedNamespace.watch("", name)
}

// UnwatchNamespaceDetail reverses WatchNamespaceDetail.
func (a *App) UnwatchNamespaceDetail(name string) {
	a.watchedNamespace.unwatch("", name)
}

// emitNamespaceDetail pushes a fresh Namespace detail on "namespace:update" (singular
// — distinct from the "namespaces:update" list topic) for the currently-watched
// Namespace, if any.
func (a *App) emitNamespaceDetail() {
	_, name, ok := a.watchedNamespace.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSync(h, "namespaces") {
		return
	}
	detail, err := kubeResources.GetNamespaceByName(h.Factory.Core().V1().Namespaces().Lister(), name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "namespace:update", detail)
}
