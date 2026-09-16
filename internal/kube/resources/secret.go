package kubeResources

import (
	"encoding/base64"
	"fmt"
	"log"
	"maps"
	"sort"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

func toSecret(s *corev1.Secret) dto.Secret {
	lbls := make([]string, 0, len(s.Labels))
	for k, v := range s.Labels {
		lbls = append(lbls, fmt.Sprintf("%s=%s", k, v))
	}
	sort.Strings(lbls)

	keys := make([]string, 0, len(s.Data)+len(s.StringData))
	for k := range s.Data {
		keys = append(keys, k)
	}
	for k := range s.StringData {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	return dto.Secret{
		Name:      s.Name,
		Namespace: s.Namespace,
		Labels:    lbls,
		Keys:      keys,
		Type:      string(s.Type),
		Age:       humanAge(s.CreationTimestamp.Time),
	}
}

func ListSecrets(lister listerscorev1.SecretLister, namespaces []string) ([]dto.Secret, error) {
	var secrets []*corev1.Secret
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		secrets = all
	} else {
		for _, ns := range namespaces {
			nsSecrets, err := lister.Secrets(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListSecrets: namespace %q: %v", ns, err)
				continue
			}
			secrets = append(secrets, nsSecrets...)
		}
	}
	result := make([]dto.Secret, len(secrets))
	for i, s := range secrets {
		result[i] = toSecret(s)
	}
	return result, nil
}

func GetSecretByName(
	lister listerscorev1.SecretLister,
	namespace, name string,
) (*dto.SecretDetail, error) {
	obj, err := lister.Secrets(namespace).Get(name)
	if err != nil {
		return nil, err
	}

	labelsCopy := make(map[string]string, len(obj.Labels))
	maps.Copy(labelsCopy, obj.Labels)
	annotationsCopy := make(map[string]string, len(obj.Annotations))
	maps.Copy(annotationsCopy, obj.Annotations)

	dataCopy := make(map[string]string, len(obj.Data))
	for k, v := range obj.Data {
		dataCopy[k] = base64.StdEncoding.EncodeToString(v)
	}

	return &dto.SecretDetail{
		Name:        obj.Name,
		Namespace:   obj.Namespace,
		Type:        string(obj.Type),
		Age:         humanAge(obj.CreationTimestamp.Time),
		CreatedAt:   obj.CreationTimestamp.Time.Format(time.RFC3339),
		Labels:      labelsCopy,
		Annotations: annotationsCopy,
		Data:        dataCopy,
	}, nil
}
