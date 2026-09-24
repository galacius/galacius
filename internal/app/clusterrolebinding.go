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

func (a *App) GetClusterRoleBindingByName(name string) (dto.ClusterRoleBinding, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "clusterrolebindings") {
		return dto.ClusterRoleBinding{}, nil
	}
	result, err := kubeResources.GetClusterRoleBindingByName(
		h.Factory.Rbac().V1().ClusterRoleBindings().Lister(),
		name,
	)
	if err != nil {
		log.Printf("app: GetClusterRoleBindingByName: %v", err)
		return dto.ClusterRoleBinding{}, nil
	}
	return result, nil
}

func (a *App) ListClusterRoleBindings() ([]dto.ClusterRoleBinding, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "clusterrolebindings") {
		return []dto.ClusterRoleBinding{}, nil
	}
	result, err := kubeResources.ListClusterRoleBindings(
		h.Factory.Rbac().V1().ClusterRoleBindings().Lister(),
	)
	if err != nil {
		log.Printf("app: ListClusterRoleBindings: %v", err)
		return []dto.ClusterRoleBinding{}, nil
	}
	return result, nil
}

func (a *App) emitClusterRoleBindings() {
	h := a.activeFactory()
	if !waitForResourceSync(h, "clusterrolebindings") {
		return
	}
	data, err := kubeResources.ListClusterRoleBindings(
		h.Factory.Rbac().V1().ClusterRoleBindings().Lister(),
	)
	if err != nil {
		log.Printf("app: emitClusterRoleBindings: %v", err)
		return
	}
	a.emitPump.Enqueue("clusterrolebindings:update", func() any { return data })
}

func (a *App) DeleteClusterRoleBinding(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.RbacV1().ClusterRoleBindings().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete ClusterRoleBinding: %w", err)
	}

	a.emitClusterRoleBindings()

	return nil
}

func (a *App) DeleteClusterRoleBindings(items []dto.ClusterRoleBindingRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		nil,
		func(r dto.ClusterRoleBindingRef) string { return r.Name },
		"clusterrolebindings",
		func(ctx context.Context, _, name string) error {
			return cs.RbacV1().ClusterRoleBindings().Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitClusterRoleBindings()

	return err
}

func (a *App) GetClusterRoleBindingYAML(name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	crb, err := cs.RbacV1().ClusterRoleBindings().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get ClusterRoleBinding: %w", err)
	}

	b, err := sigsyaml.Marshal(crb)
	if err != nil {
		return "", fmt.Errorf("marshal ClusterRoleBinding: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdateClusterRoleBindingYAML(yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var crb rbacv1.ClusterRoleBinding
	err = sigsyaml.Unmarshal([]byte(yamlString), &crb)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to ClusterRoleBinding: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.RbacV1().ClusterRoleBindings().Update(ctx, &crb, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update ClusterRoleBinding: %w", err)
	}

	a.emitClusterRoleBindings()

	return nil
}

// WatchClusterRoleBindingDetail registers the frontend's interest in live "clusterrolebinding:update"
// detail pushes for one specific ClusterRoleBinding (name) — the one currently shown in
// the (single) open ClusterRoleBinding detail drawer. Call UnwatchClusterRoleBindingDetail on
// drawer close/unmount to stop.
func (a *App) WatchClusterRoleBindingDetail(name string) {
	a.watchedClusterRoleBinding.watch("", name)
}

// UnwatchClusterRoleBindingDetail reverses WatchClusterRoleBindingDetail.
func (a *App) UnwatchClusterRoleBindingDetail(name string) {
	a.watchedClusterRoleBinding.unwatch("", name)
}

// emitClusterRoleBindingDetail pushes a fresh ClusterRoleBinding detail on "clusterrolebinding:update" (singular
// — distinct from the "clusterrolebindings:update" list topic) for the currently-watched
// ClusterRoleBinding, if any.
func (a *App) emitClusterRoleBindingDetail() {
	_, name, ok := a.watchedClusterRoleBinding.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSync(h, "clusterrolebindings") {
		return
	}
	detail, err := kubeResources.GetClusterRoleBindingByName(h.Factory.Rbac().V1().ClusterRoleBindings().Lister(), name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("clusterrolebinding:update", func() any { return detail })
}
