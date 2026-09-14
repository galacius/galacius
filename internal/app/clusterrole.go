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

func (a *App) GetClusterRoleByName(name string) (dto.ClusterRole, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "clusterroles") {
		return dto.ClusterRole{}, nil
	}
	result, err := kubeResources.GetClusterRoleByName(
		h.Factory.Rbac().V1().ClusterRoles().Lister(),
		name,
	)
	if err != nil {
		log.Printf("app: GetClusterRoleByName: %v", err)
		return dto.ClusterRole{}, nil
	}
	return result, nil
}

func (a *App) ListClusterRoles() ([]dto.ClusterRole, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "clusterroles") {
		return []dto.ClusterRole{}, nil
	}
	result, err := kubeResources.ListClusterRoles(
		h.Factory.Rbac().V1().ClusterRoles().Lister(),
	)
	if err != nil {
		log.Printf("app: ListClusterRoles: %v", err)
		return []dto.ClusterRole{}, nil
	}
	return result, nil
}

func (a *App) emitClusterRoles() {
	h := a.activeFactory()
	if !waitForResourceSync(h, "clusterroles") {
		return
	}
	data, err := kubeResources.ListClusterRoles(
		h.Factory.Rbac().V1().ClusterRoles().Lister(),
	)
	if err != nil {
		log.Printf("app: emitClusterRoles: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "clusterroles:update", data)
}

func (a *App) DeleteClusterRole(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.RbacV1().ClusterRoles().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete ClusterRole: %w", err)
	}

	a.emitClusterRoles()

	return nil
}

func (a *App) DeleteClusterRoles(items []dto.ClusterRoleRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		nil,
		func(r dto.ClusterRoleRef) string { return r.Name },
		"clusterroles",
		func(ctx context.Context, _, name string) error {
			return cs.RbacV1().ClusterRoles().Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitClusterRoles()

	return err
}

func (a *App) GetClusterRoleYAML(name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	cr, err := cs.RbacV1().ClusterRoles().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get ClusterRole: %w", err)
	}

	b, err := sigsyaml.Marshal(cr)
	if err != nil {
		return "", fmt.Errorf("marshal ClusterRole: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdateClusterRoleYAML(yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var cr rbacv1.ClusterRole
	err = sigsyaml.Unmarshal([]byte(yamlString), &cr)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to ClusterRole: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.RbacV1().ClusterRoles().Update(ctx, &cr, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update ClusterRole: %w", err)
	}

	a.emitClusterRoles()

	return nil
}

// WatchClusterRoleDetail registers the frontend's interest in live "clusterrole:update"
// detail pushes for one specific ClusterRole (name) — the one currently shown in
// the (single) open ClusterRole detail drawer. Call UnwatchClusterRoleDetail on
// drawer close/unmount to stop.
func (a *App) WatchClusterRoleDetail(name string) {
	a.watchedClusterRole.watch("", name)
}

// UnwatchClusterRoleDetail reverses WatchClusterRoleDetail.
func (a *App) UnwatchClusterRoleDetail(name string) {
	a.watchedClusterRole.unwatch("", name)
}

// emitClusterRoleDetail pushes a fresh ClusterRole detail on "clusterrole:update" (singular
// — distinct from the "clusterroles:update" list topic) for the currently-watched
// ClusterRole, if any.
func (a *App) emitClusterRoleDetail() {
	_, name, ok := a.watchedClusterRole.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSync(h, "clusterroles") {
		return
	}
	detail, err := kubeResources.GetClusterRoleByName(h.Factory.Rbac().V1().ClusterRoles().Lister(), name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "clusterrole:update", detail)
}
