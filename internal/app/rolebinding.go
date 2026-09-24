package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) GetRoleBindingByName(namespace, name string) (dto.RoleBinding, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "rolebindings") {
		return dto.RoleBinding{}, nil
	}
	result, err := kubeResources.GetRoleBindingByName(
		h.RoleBindingLister(),
		namespace,
		name,
	)
	if err != nil {
		log.Printf("app: GetRoleBindingByName: %v", err)
		return dto.RoleBinding{}, nil
	}
	return result, nil
}

func (a *App) ListRoleBindings() ([]dto.RoleBinding, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "rolebindings") {
		return []dto.RoleBinding{}, nil
	}
	result, err := kubeResources.ListRoleBindings(
		h.RoleBindingLister(),
		namespaces,
	)
	if err != nil {
		log.Printf("app: ListRoleBindings: %v", err)
		return []dto.RoleBinding{}, nil
	}
	return result, nil
}

func (a *App) emitRoleBindings() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "rolebindings") {
		return
	}
	lister := h.RoleBindingLister()
	data, err := kubeResources.ListRoleBindings(lister, namespaces)
	if err != nil {
		log.Printf("app: emitRoleBindings: %v", err)
		return
	}
	a.emitPump.Enqueue("rolebindings:update", func() any { return data })
}

func (a *App) DeleteRoleBinding(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.RbacV1().RoleBindings(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete RoleBinding: %w", err)
	}

	a.emitRoleBindings()

	return nil
}

func (a *App) DeleteRoleBindings(items []dto.RoleBindingRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.RoleBindingRef) string { return r.Namespace },
		func(r dto.RoleBindingRef) string { return r.Name },
		"rolebindings",
		func(ctx context.Context, namespace, name string) error {
			return cs.RbacV1().RoleBindings(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitRoleBindings()

	return err
}

func (a *App) GetRoleBindingYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	rb, err := cs.RbacV1().RoleBindings(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get RoleBinding: %w", err)
	}

	b, err := sigsyaml.Marshal(rb)
	if err != nil {
		return "", fmt.Errorf("marshal RoleBinding: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdateRoleBindingYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var rb rbacv1.RoleBinding
	err = sigsyaml.Unmarshal([]byte(yamlString), &rb)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to RoleBinding: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.RbacV1().RoleBindings(namespace).Update(ctx, &rb, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update RoleBinding: %w", err)
	}

	a.emitRoleBindings()

	return nil
}

// WatchRoleBindingDetail registers the frontend's interest in live "rolebinding:update"
// detail pushes for one specific RoleBinding (namespace/name) — the one currently
// shown in the (single) open RoleBinding detail drawer. Call UnwatchRoleBindingDetail
// on drawer close/unmount to stop.
func (a *App) WatchRoleBindingDetail(namespace, name string) {
	a.watchedRoleBinding.watch(namespace, name)
}

// UnwatchRoleBindingDetail reverses WatchRoleBindingDetail.
func (a *App) UnwatchRoleBindingDetail(namespace, name string) {
	a.watchedRoleBinding.unwatch(namespace, name)
}

// emitRoleBindingDetail pushes a fresh detail on "rolebinding:update" (singular — distinct from the
// "rolebindings:update" list topic) for the currently-watched RoleBinding, if any.
func (a *App) emitRoleBindingDetail() {
	namespace, name, ok := a.watchedRoleBinding.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "rolebindings") {
		return
	}
	detail, err := kubeResources.GetRoleBindingByName(h.RoleBindingLister(), namespace, name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("rolebinding:update", func() any { return detail })
}
