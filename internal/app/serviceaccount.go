package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) GetServiceAccountByName(namespace, name string) (dto.ServiceAccount, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "serviceaccounts") {
		return dto.ServiceAccount{}, nil
	}
	result, err := kubeResources.GetServiceAccountByName(
		h.ServiceAccountLister(),
		namespace,
		name,
	)
	if err != nil {
		log.Printf("app: GetServiceAccountByName: %v", err)
		return dto.ServiceAccount{}, nil
	}
	return result, nil
}

func (a *App) ListServiceAccounts() ([]dto.ServiceAccount, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "serviceaccounts") {
		return []dto.ServiceAccount{}, nil
	}
	result, err := kubeResources.ListServiceAccounts(
		h.ServiceAccountLister(),
		namespaces,
	)
	if err != nil {
		log.Printf("app: ListServiceAccounts: %v", err)
		return []dto.ServiceAccount{}, nil
	}
	return result, nil
}

func (a *App) DeleteServiceAccount(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoreV1().ServiceAccounts(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete ServiceAccount: %w", err)
	}

	a.emitServiceAccounts()

	return nil
}

// DeleteServiceAccounts deletes multiple ServiceAccounts, handling best-effort deletion across namespaces.
func (a *App) DeleteServiceAccounts(items []dto.ServiceAccountRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.ServiceAccountRef) string { return r.Namespace },
		func(r dto.ServiceAccountRef) string { return r.Name },
		"serviceaccounts",
		func(ctx context.Context, namespace, name string) error {
			return cs.CoreV1().ServiceAccounts(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitServiceAccounts()

	return err
}

func (a *App) emitServiceAccounts() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "serviceaccounts") {
		return
	}
	lister := h.ServiceAccountLister()
	data, err := kubeResources.ListServiceAccounts(lister, namespaces)
	if err != nil {
		log.Printf("app: emitServiceAccounts: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "serviceaccounts:update", data)
}

func (a *App) GetServiceAccountYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	sa, err := cs.CoreV1().ServiceAccounts(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get ServiceAccount: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(sa)
	if err != nil {
		return "", fmt.Errorf("marshal ServiceAccount to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateServiceAccountYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var sa corev1.ServiceAccount
	err = sigsyaml.Unmarshal([]byte(yamlString), &sa)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to ServiceAccount: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().ServiceAccounts(namespace).Update(ctx, &sa, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update ServiceAccount: %w", err)
	}

	a.emitServiceAccounts()

	return nil
}

// WatchServiceAccountDetail registers the frontend's interest in live "serviceaccount:update"
// detail pushes for one specific ServiceAccount (namespace/name) — the one currently
// shown in the (single) open ServiceAccount detail drawer. Call UnwatchServiceAccountDetail
// on drawer close/unmount to stop.
func (a *App) WatchServiceAccountDetail(namespace, name string) {
	a.watchedServiceAccount.watch(namespace, name)
}

// UnwatchServiceAccountDetail reverses WatchServiceAccountDetail.
func (a *App) UnwatchServiceAccountDetail(namespace, name string) {
	a.watchedServiceAccount.unwatch(namespace, name)
}

// emitServiceAccountDetail pushes a fresh detail on "serviceaccount:update" (singular — distinct from the
// "serviceaccounts:update" list topic) for the currently-watched ServiceAccount, if any.
func (a *App) emitServiceAccountDetail() {
	namespace, name, ok := a.watchedServiceAccount.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "serviceaccounts") {
		return
	}
	detail, err := kubeResources.GetServiceAccountByName(h.ServiceAccountLister(), namespace, name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "serviceaccount:update", detail)
}
