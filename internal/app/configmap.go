package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListConfigMaps() ([]dto.ConfigMap, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "configmaps") {
		return []dto.ConfigMap{}, nil
	}
	result, err := kubeResources.ListConfigMaps(h.ConfigMapLister(), namespaces)
	if err != nil {
		log.Printf("app: ListConfigMaps: %v", err)
		return []dto.ConfigMap{}, nil
	}
	return result, nil
}

func (a *App) GetConfigMapByName(namespace, name string) (dto.ConfigMap, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "configmaps") {
		return dto.ConfigMap{}, nil
	}
	result, err := kubeResources.GetConfigMapByName(h.ConfigMapLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetConfigMapByName: %v", err)
		return dto.ConfigMap{}, nil
	}
	return result, nil
}

func (a *App) UpdateConfigMap(namespace, name string, data map[string]string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	cm, err := cs.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return err
	}
	cm.Data = data
	_, err = cs.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
	return err
}

func (a *App) DeleteConfigMap(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete ConfigMap: %w", err)
	}

	a.emitConfigMaps()

	return nil
}

// DeleteConfigMaps deletes multiple ConfigMaps, handling best-effort deletion across namespaces.
func (a *App) DeleteConfigMaps(items []dto.ConfigMapRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.ConfigMapRef) string { return r.Namespace },
		func(r dto.ConfigMapRef) string { return r.Name },
		"configmaps",
		func(ctx context.Context, namespace, name string) error {
			return cs.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitConfigMaps()

	return err
}

func (a *App) emitConfigMaps() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "configmaps") {
		return
	}
	lister := h.ConfigMapLister()
	data, err := kubeResources.ListConfigMaps(lister, namespaces)
	if err != nil {
		log.Printf("app: emitConfigMaps: %v", err)
		return
	}
	a.emitPump.Enqueue("configmaps:update", func() any { return data })
}

func (a *App) GetConfigMapYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	cm, err := cs.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get ConfigMap: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(cm)
	if err != nil {
		return "", fmt.Errorf("marshal ConfigMap to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateConfigMapYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var cm corev1.ConfigMap
	err = sigsyaml.Unmarshal([]byte(yamlString), &cm)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to ConfigMap: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().ConfigMaps(namespace).Update(ctx, &cm, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update ConfigMap: %w", err)
	}

	a.emitConfigMaps()

	return nil
}

// WatchConfigMapDetail registers the frontend's interest in live "configmap:update"
// detail pushes for one specific ConfigMap (namespace/name) — the one currently
// shown in the (single) open ConfigMap detail drawer. Call UnwatchConfigMapDetail
// on drawer close/unmount to stop.
func (a *App) WatchConfigMapDetail(namespace, name string) {
	a.watchedConfigMap.watch(namespace, name)
}

// UnwatchConfigMapDetail reverses WatchConfigMapDetail.
func (a *App) UnwatchConfigMapDetail(namespace, name string) {
	a.watchedConfigMap.unwatch(namespace, name)
}

// emitConfigMapDetail pushes a fresh detail on "configmap:update" (singular — distinct from the
// "configmaps:update" list topic) for the currently-watched ConfigMap, if any.
func (a *App) emitConfigMapDetail() {
	namespace, name, ok := a.watchedConfigMap.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "configmaps") {
		return
	}
	detail, err := kubeResources.GetConfigMapByName(h.ConfigMapLister(), namespace, name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("configmap:update", func() any { return detail })
}
