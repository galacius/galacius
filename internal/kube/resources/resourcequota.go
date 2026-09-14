package kubeResources

import (
	"log"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

func toResourceQuota(rq *corev1.ResourceQuota) dto.ResourceQuota {
	return dto.ResourceQuota{
		Name:      rq.Name,
		Namespace: rq.Namespace,
		Age:       humanAge(rq.CreationTimestamp.Time),
	}
}

func ListResourceQuotas(lister listerscorev1.ResourceQuotaLister, namespaces []string) ([]dto.ResourceQuota, error) {
	var rqs []*corev1.ResourceQuota
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		rqs = all
	} else {
		for _, ns := range namespaces {
			nsRqs, err := lister.ResourceQuotas(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListResourceQuotas: namespace %q: %v", ns, err)
				continue
			}
			rqs = append(rqs, nsRqs...)
		}
	}
	result := make([]dto.ResourceQuota, len(rqs))
	for i, rq := range rqs {
		result[i] = toResourceQuota(rq)
	}
	return result, nil
}

func GetResourceQuotaByName(lister listerscorev1.ResourceQuotaLister, namespace, name string) (dto.ResourceQuotaDetail, error) {
	rq, err := lister.ResourceQuotas(namespace).Get(name)
	if err != nil {
		return dto.ResourceQuotaDetail{}, err
	}
	hard := make(map[string]string, len(rq.Spec.Hard))
	for k, v := range rq.Spec.Hard {
		hard[string(k)] = v.String()
	}
	used := make(map[string]string, len(rq.Status.Used))
	for k, v := range rq.Status.Used {
		used[string(k)] = v.String()
	}
	return dto.ResourceQuotaDetail{
		Name:        rq.Name,
		Namespace:   rq.Namespace,
		Age:         humanAge(rq.CreationTimestamp.Time),
		CreatedAt:   rq.CreationTimestamp.Time.Format(time.RFC3339),
		Labels:      rq.Labels,
		Annotations: rq.Annotations,
		Hard:        hard,
		Used:        used,
	}, nil
}
