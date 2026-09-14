package kubeResources

import (
	"context"
	"log"
	"sort"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	corev1client "k8s.io/client-go/kubernetes/typed/core/v1"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

func toConfigMap(cm *corev1.ConfigMap) dto.ConfigMap {
	keys := make([]string, 0, len(cm.Data)+len(cm.BinaryData))
	for k := range cm.Data {
		keys = append(keys, k)
	}
	for k := range cm.BinaryData {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	managedFields := toManagedFields(cm)

	return dto.ConfigMap{
		Name:          cm.Name,
		Namespace:     cm.Namespace,
		Keys:          keys,
		Age:           humanAge(cm.CreationTimestamp.Time),
		CreatedAt:     cm.CreationTimestamp.UTC().Format(time.RFC3339),
		Labels:        cm.Labels,
		Annotations:   cm.Annotations,
		ManagedFields: managedFields,
		Data:          cm.Data,
	}
}

func ListConfigMaps(lister listerscorev1.ConfigMapLister, namespaces []string) ([]dto.ConfigMap, error) {
	var cms []*corev1.ConfigMap
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		cms = all
	} else {
		for _, ns := range namespaces {
			nsCms, err := lister.ConfigMaps(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListConfigMaps: namespace %q: %v", ns, err)
				continue
			}
			cms = append(cms, nsCms...)
		}
	}
	result := make([]dto.ConfigMap, len(cms))
	for i, cm := range cms {
		result[i] = toConfigMap(cm)
	}
	return result, nil
}

func GetConfigMapByName(lister listerscorev1.ConfigMapLister, namespace, name string) (dto.ConfigMap, error) {
	cm, err := lister.ConfigMaps(namespace).Get(name)
	if err != nil {
		return dto.ConfigMap{}, err
	}
	return toConfigMap(cm), nil
}

func UpdateConfigMap(client corev1client.ConfigMapInterface, cm *corev1.ConfigMap, data map[string]string) (*corev1.ConfigMap, error) {
	updated := cm.DeepCopy()
	updated.Data = data
	return client.Update(context.Background(), updated, metav1.UpdateOptions{})
}
