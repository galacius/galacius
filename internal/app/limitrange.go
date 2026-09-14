package app

import (
	"context"
	"fmt"
	"log"
	"strings"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	resource_api "k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListLimitRanges() ([]dto.LimitRange, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "limitranges") {
		return []dto.LimitRange{}, nil
	}
	result, err := kubeResources.ListLimitRanges(h.LimitRangeLister(), namespaces)
	if err != nil {
		log.Printf("app: ListLimitRanges: %v", err)
		return []dto.LimitRange{}, nil
	}
	return result, nil
}

func (a *App) WatchLimitRangeDetail(namespace, name string) {
	a.watchedLimitRange.watch(namespace, name)
}

func (a *App) UnwatchLimitRangeDetail(namespace, name string) {
	a.watchedLimitRange.unwatch(namespace, name)
}

func (a *App) emitLimitRangeDetail() {
	namespace, name, ok := a.watchedLimitRange.get()
	if !ok {
		return
	}
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "limitranges") {
		return
	}
	detail, err := kubeResources.GetLimitRangeByName(h.LimitRangeLister(), namespace, name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "limitrange:update", detail)
}

func (a *App) GetLimitRangeByName(namespace, name string) dto.LimitRangeDetail {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "limitranges") {
		return dto.LimitRangeDetail{}
	}
	result, err := kubeResources.GetLimitRangeByName(h.LimitRangeLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetLimitRangeByName: %v", err)
		return dto.LimitRangeDetail{}
	}
	return result
}

// CreateLimitRange creates a new LimitRange in the given namespace.
// limits format: map[limitType]map["resource/valueType"]value
// limitType is one of: "Container", "Pod", "PersistentVolumeClaim"
// e.g., { "Container": {"cpu/Max": "1", "memory/Default": "256Mi"}, "Pod": {"cpu/Max": "2"} }
func (a *App) CreateLimitRange(namespace, name string, limits map[string]map[string]string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	limitTypeMap := map[string]corev1.LimitType{
		"Container":             corev1.LimitTypeContainer,
		"Pod":                   corev1.LimitTypePod,
		"PersistentVolumeClaim": corev1.LimitTypePersistentVolumeClaim,
	}

	// Build one LimitRangeItem per limitType — Kubernetes rejects duplicate types.
	itemMap := map[string]*corev1.LimitRangeItem{}
	for limitType, resourceValues := range limits {
		lrt, ok := limitTypeMap[limitType]
		if !ok {
			return fmt.Errorf("unknown limit type %q", limitType)
		}
		item, exists := itemMap[limitType]
		if !exists {
			item = &corev1.LimitRangeItem{Type: lrt}
			itemMap[limitType] = item
		}
		for key, val := range resourceValues {
			// key format: "resource/valueType" e.g., "cpu/Max", "memory/Default"
			parts := strings.SplitN(key, "/", 2)
			if len(parts) != 2 {
				continue
			}
			resource := corev1.ResourceName(parts[0])
			valueType := parts[1]
			qty, err := resource_api.ParseQuantity(val)
			if err != nil {
				return fmt.Errorf("invalid quantity %q for %s: %w", val, key, err)
			}
			switch valueType {
			case "Min":
				if item.Min == nil {
					item.Min = corev1.ResourceList{}
				}
				item.Min[resource] = qty
			case "Max":
				if item.Max == nil {
					item.Max = corev1.ResourceList{}
				}
				item.Max[resource] = qty
			case "Default":
				if item.Default == nil {
					item.Default = corev1.ResourceList{}
				}
				item.Default[resource] = qty
			case "DefaultRequest":
				if item.DefaultRequest == nil {
					item.DefaultRequest = corev1.ResourceList{}
				}
				item.DefaultRequest[resource] = qty
			}
		}
	}
	items := make([]corev1.LimitRangeItem, 0, len(itemMap))
	for _, item := range itemMap {
		items = append(items, *item)
	}

	lr := &corev1.LimitRange{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Spec: corev1.LimitRangeSpec{
			Limits: items,
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().LimitRanges(namespace).Create(ctx, lr, metav1.CreateOptions{})
	if err != nil {
		return err
	}

	a.emitLimitRanges()
	return nil
}

func (a *App) DeleteLimitRange(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoreV1().LimitRanges(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete LimitRange: %w", err)
	}

	a.emitLimitRanges()

	return nil
}

// DeleteLimitRanges deletes multiple LimitRanges, handling best-effort deletion across namespaces.
func (a *App) DeleteLimitRanges(items []dto.LimitRangeRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.LimitRangeRef) string { return r.Namespace },
		func(r dto.LimitRangeRef) string { return r.Name },
		"limitranges",
		func(ctx context.Context, namespace, name string) error {
			return cs.CoreV1().LimitRanges(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitLimitRanges()

	return err
}

func (a *App) emitLimitRanges() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "limitranges") {
		return
	}
	lister := h.LimitRangeLister()
	data, err := kubeResources.ListLimitRanges(lister, namespaces)
	if err != nil {
		log.Printf("app: emitLimitRanges: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "limitranges:update", data)
}

func (a *App) GetLimitRangeYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	lr, err := cs.CoreV1().LimitRanges(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get LimitRange: %w", err)
	}

	b, err := sigsyaml.Marshal(lr)
	if err != nil {
		return "", fmt.Errorf("marshal LimitRange: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdateLimitRangeYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var lr corev1.LimitRange
	err = sigsyaml.Unmarshal([]byte(yamlString), &lr)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to LimitRange: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().LimitRanges(namespace).Update(ctx, &lr, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update LimitRange: %w", err)
	}

	a.emitLimitRanges()

	return nil
}
