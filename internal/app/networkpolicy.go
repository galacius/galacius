package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListNetworkPolicies() ([]dto.NetworkPolicy, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "networkpolicies") {
		return []dto.NetworkPolicy{}, nil
	}
	result, err := kubeResources.ListNetworkPolicies(h.NetworkPolicyLister(), namespaces)
	if err != nil {
		log.Printf("app: ListNetworkPolicies: %v", err)
		return []dto.NetworkPolicy{}, nil
	}
	return result, nil
}

func (a *App) WatchNetworkPolicyDetail(namespace, name string) {
	a.watchedNetworkPolicy.watch(namespace, name)
}

func (a *App) UnwatchNetworkPolicyDetail(namespace, name string) {
	a.watchedNetworkPolicy.unwatch(namespace, name)
}

func (a *App) emitNetworkPolicyDetail() {
	namespace, name, ok := a.watchedNetworkPolicy.get()
	if !ok {
		return
	}
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "networkpolicies") {
		return
	}
	detail, err := kubeResources.GetNetworkPolicyByName(h.NetworkPolicyLister(), namespace, name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "networkpolicy:update", detail)
}

func (a *App) GetNetworkPolicyByName(namespace, name string) (*dto.NetworkPolicyDetail, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "networkpolicies") {
		return nil, nil
	}
	result, err := kubeResources.GetNetworkPolicyByName(h.NetworkPolicyLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetNetworkPolicyByName: %v", err)
		return nil, err
	}
	return result, nil
}

// DeleteNetworkPolicy deletes a NetworkPolicy from the specified namespace.
func (a *App) DeleteNetworkPolicy(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.NetworkingV1().NetworkPolicies(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete NetworkPolicy: %w", err)
	}

	// Emit update event after successful delete
	a.emitNetworkPolicies()

	return nil
}

// DeleteNetworkPolicies deletes multiple NetworkPolicies, handling best-effort deletion across namespaces.
func (a *App) DeleteNetworkPolicies(items []dto.NetworkPolicyRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.NetworkPolicyRef) string { return r.Namespace },
		func(r dto.NetworkPolicyRef) string { return r.Name },
		"networkpolicies",
		func(ctx context.Context, namespace, name string) error {
			return cs.NetworkingV1().NetworkPolicies(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitNetworkPolicies()

	return err
}

func (a *App) emitNetworkPolicies() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "networkpolicies") {
		return
	}
	lister := h.NetworkPolicyLister()
	data, err := kubeResources.ListNetworkPolicies(lister, namespaces)
	if err != nil {
		log.Printf("app: emitNetworkPolicies: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "networkpolicies:update", data)
}

func (a *App) GetNetworkPolicyYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	np, err := cs.NetworkingV1().NetworkPolicies(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get NetworkPolicy: %w", err)
	}

	b, err := sigsyaml.Marshal(np)
	if err != nil {
		return "", fmt.Errorf("marshal NetworkPolicy to YAML: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdateNetworkPolicyYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var np networkingv1.NetworkPolicy
	err = sigsyaml.Unmarshal([]byte(yamlString), &np)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to NetworkPolicy: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.NetworkingV1().NetworkPolicies(namespace).Update(ctx, &np, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update NetworkPolicy: %w", err)
	}

	a.emitNetworkPolicies()

	return nil
}
