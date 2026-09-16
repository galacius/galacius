package kubeResources

import (
	"log"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

func toLimitRange(lr *corev1.LimitRange) dto.LimitRange {
	return dto.LimitRange{
		Name:      lr.Name,
		Namespace: lr.Namespace,
		Age:       humanAge(lr.CreationTimestamp.Time),
	}
}

func ListLimitRanges(lister listerscorev1.LimitRangeLister, namespaces []string) ([]dto.LimitRange, error) {
	var lrs []*corev1.LimitRange
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		lrs = all
	} else {
		for _, ns := range namespaces {
			nsLrs, err := lister.LimitRanges(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListLimitRanges: namespace %q: %v", ns, err)
				continue
			}
			lrs = append(lrs, nsLrs...)
		}
	}
	result := make([]dto.LimitRange, len(lrs))
	for i, lr := range lrs {
		result[i] = toLimitRange(lr)
	}
	return result, nil
}

func GetLimitRangeByName(lister listerscorev1.LimitRangeLister, namespace, name string) (dto.LimitRangeDetail, error) {
	lr, err := lister.LimitRanges(namespace).Get(name)
	if err != nil {
		return dto.LimitRangeDetail{}, err
	}
	limits := make(map[string]map[string]map[string]string)
	for _, item := range lr.Spec.Limits {
		itemType := string(item.Type)
		if limits[itemType] == nil {
			limits[itemType] = make(map[string]map[string]string)
		}
		if item.Min != nil {
			for k, v := range item.Min {
				resourceName := string(k)
				if limits[itemType][resourceName] == nil {
					limits[itemType][resourceName] = make(map[string]string)
				}
				limits[itemType][resourceName]["Min"] = v.String()
			}
		}
		if item.Max != nil {
			for k, v := range item.Max {
				resourceName := string(k)
				if limits[itemType][resourceName] == nil {
					limits[itemType][resourceName] = make(map[string]string)
				}
				limits[itemType][resourceName]["Max"] = v.String()
			}
		}
		if item.Default != nil {
			for k, v := range item.Default {
				resourceName := string(k)
				if limits[itemType][resourceName] == nil {
					limits[itemType][resourceName] = make(map[string]string)
				}
				limits[itemType][resourceName]["Default"] = v.String()
			}
		}
		if item.DefaultRequest != nil {
			for k, v := range item.DefaultRequest {
				resourceName := string(k)
				if limits[itemType][resourceName] == nil {
					limits[itemType][resourceName] = make(map[string]string)
				}
				limits[itemType][resourceName]["DefaultRequest"] = v.String()
			}
		}
	}
	return dto.LimitRangeDetail{
		Name:        lr.Name,
		Namespace:   lr.Namespace,
		Age:         humanAge(lr.CreationTimestamp.Time),
		CreatedAt:   lr.CreationTimestamp.Time.UTC().Format(time.RFC3339),
		Labels:      lr.Labels,
		Annotations: lr.Annotations,
		Limits:      limits,
	}, nil
}
