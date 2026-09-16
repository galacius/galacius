package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) GetRoleByName(namespace, name string) (dto.Role, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "roles") {
		return dto.Role{}, nil
	}
	result, err := kubeResources.GetRoleByName(
		h.RoleLister(),
		namespace,
		name,
	)
	if err != nil {
		log.Printf("app: GetRoleByName: %v", err)
		return dto.Role{}, nil
	}
	return result, nil
}

func (a *App) ListRoles() ([]dto.Role, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "roles") {
		return []dto.Role{}, nil
	}
	result, err := kubeResources.ListRoles(
		h.RoleLister(),
		namespaces,
	)
	if err != nil {
		log.Printf("app: ListRoles: %v", err)
		return []dto.Role{}, nil
	}
	return result, nil
}

func (a *App) emitRoles() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "roles") {
		return
	}
	lister := h.RoleLister()
	data, err := kubeResources.ListRoles(lister, namespaces)
	if err != nil {
		log.Printf("app: emitRoles: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "roles:update", data)
}

func (a *App) DeleteRole(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.RbacV1().Roles(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete Role: %w", err)
	}

	a.emitRoles()

	return nil
}

func (a *App) DeleteRoles(items []dto.RoleRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.RoleRef) string { return r.Namespace },
		func(r dto.RoleRef) string { return r.Name },
		"roles",
		func(ctx context.Context, namespace, name string) error {
			return cs.RbacV1().Roles(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitRoles()

	return err
}

func (a *App) GetRoleYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	role, err := cs.RbacV1().Roles(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get Role: %w", err)
	}

	b, err := sigsyaml.Marshal(role)
	if err != nil {
		return "", fmt.Errorf("marshal Role: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdateRoleYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var role rbacv1.Role
	err = sigsyaml.Unmarshal([]byte(yamlString), &role)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to Role: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.RbacV1().Roles(namespace).Update(ctx, &role, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Role: %w", err)
	}

	a.emitRoles()

	return nil
}

// WatchRoleDetail registers the frontend's interest in live "role:update"
// detail pushes for one specific Role (namespace/name) — the one currently
// shown in the (single) open Role detail drawer. Call UnwatchRoleDetail
// on drawer close/unmount to stop.
func (a *App) WatchRoleDetail(namespace, name string) {
	a.watchedRole.watch(namespace, name)
}

// UnwatchRoleDetail reverses WatchRoleDetail.
func (a *App) UnwatchRoleDetail(namespace, name string) {
	a.watchedRole.unwatch(namespace, name)
}

// emitRoleDetail pushes a fresh detail on "role:update" (singular — distinct from the
// "roles:update" list topic) for the currently-watched Role, if any.
func (a *App) emitRoleDetail() {
	namespace, name, ok := a.watchedRole.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "roles") {
		return
	}
	detail, err := kubeResources.GetRoleByName(h.RoleLister(), namespace, name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "role:update", detail)
}
