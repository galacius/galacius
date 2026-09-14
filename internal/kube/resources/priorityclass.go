package kubeResources

import (
	"sort"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	schedulingv1 "k8s.io/api/scheduling/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersschedulingv1 "k8s.io/client-go/listers/scheduling/v1"
)

func toPriorityClass(pc *schedulingv1.PriorityClass) dto.PriorityClass {
	preemptionPolicy := ""
	if pc.PreemptionPolicy != nil {
		preemptionPolicy = string(*pc.PreemptionPolicy)
	}

	managedFields := toManagedFields(pc)

	return dto.PriorityClass{
		Name:             pc.Name,
		Value:            pc.Value,
		GlobalDefault:    pc.GlobalDefault,
		Description:      pc.Description,
		PreemptionPolicy: preemptionPolicy,
		Age:              humanAge(pc.CreationTimestamp.Time),
		CreatedAt:        pc.CreationTimestamp.UTC().Format(time.RFC3339),
		ManagedFields:    managedFields,
	}
}

func GetPriorityClassByName(lister listersschedulingv1.PriorityClassLister, name string) (dto.PriorityClass, error) {
	pc, err := lister.Get(name)
	if err != nil {
		return dto.PriorityClass{}, err
	}
	return toPriorityClass(pc), nil
}

func ListPriorityClasses(lister listersschedulingv1.PriorityClassLister) ([]dto.PriorityClass, error) {
	pcs, err := lister.List(labels.Everything())
	if err != nil {
		return nil, err
	}
	sort.Slice(pcs, func(i, j int) bool {
		return pcs[i].Name < pcs[j].Name
	})
	result := make([]dto.PriorityClass, len(pcs))
	for i, pc := range pcs {
		result[i] = toPriorityClass(pc)
	}
	return result, nil
}
