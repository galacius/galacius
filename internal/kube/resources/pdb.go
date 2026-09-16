package kubeResources

import (
	"log"
	"maps"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	policyv1 "k8s.io/api/policy/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerspolicyv1 "k8s.io/client-go/listers/policy/v1"
)

func toPodDisruptionBudget(pdb *policyv1.PodDisruptionBudget) dto.PodDisruptionBudget {
	minAvailable := "-"
	if pdb.Spec.MinAvailable != nil {
		minAvailable = pdb.Spec.MinAvailable.String()
	}

	maxUnavailable := "-"
	if pdb.Spec.MaxUnavailable != nil {
		maxUnavailable = pdb.Spec.MaxUnavailable.String()
	}

	return dto.PodDisruptionBudget{
		Name:           pdb.Name,
		Namespace:      pdb.Namespace,
		MinAvailable:   minAvailable,
		MaxUnavailable: maxUnavailable,
		CurrentHealthy: pdb.Status.CurrentHealthy,
		DesiredHealthy: pdb.Status.DesiredHealthy,
		Age:            humanAge(pdb.CreationTimestamp.Time),
	}
}

func ListPodDisruptionBudgets(lister listerspolicyv1.PodDisruptionBudgetLister, namespaces []string) ([]dto.PodDisruptionBudget, error) {
	var pdbs []*policyv1.PodDisruptionBudget
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		pdbs = all
	} else {
		for _, ns := range namespaces {
			nsPdbs, err := lister.PodDisruptionBudgets(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListPodDisruptionBudgets: namespace %q: %v", ns, err)
				continue
			}
			pdbs = append(pdbs, nsPdbs...)
		}
	}
	result := make([]dto.PodDisruptionBudget, len(pdbs))
	for i, pdb := range pdbs {
		result[i] = toPodDisruptionBudget(pdb)
	}
	return result, nil
}

func GetPodDisruptionBudgetByName(
	lister listerspolicyv1.PodDisruptionBudgetLister,
	namespace, name string,
) (*dto.PodDisruptionBudgetDetail, error) {
	obj, err := lister.PodDisruptionBudgets(namespace).Get(name)
	if err != nil {
		return nil, err
	}

	minAvailable := "-"
	if obj.Spec.MinAvailable != nil {
		minAvailable = obj.Spec.MinAvailable.String()
	}

	maxUnavailable := "-"
	if obj.Spec.MaxUnavailable != nil {
		maxUnavailable = obj.Spec.MaxUnavailable.String()
	}

	labelsCopy := make(map[string]string, len(obj.Labels))
	maps.Copy(labelsCopy, obj.Labels)
	annotationsCopy := make(map[string]string, len(obj.Annotations))
	maps.Copy(annotationsCopy, obj.Annotations)

	selectorCopy := map[string]string{}
	if obj.Spec.Selector != nil {
		maps.Copy(selectorCopy, obj.Spec.Selector.MatchLabels)
	}

	return &dto.PodDisruptionBudgetDetail{
		Name:           obj.Name,
		Namespace:      obj.Namespace,
		MinAvailable:   minAvailable,
		MaxUnavailable: maxUnavailable,
		CurrentHealthy: obj.Status.CurrentHealthy,
		DesiredHealthy: obj.Status.DesiredHealthy,
		Age:            humanAge(obj.CreationTimestamp.Time),
		CreatedAt:      obj.CreationTimestamp.Time.Format(time.RFC3339),
		Labels:         labelsCopy,
		Annotations:    annotationsCopy,
		Selector:       selectorCopy,
	}, nil
}
