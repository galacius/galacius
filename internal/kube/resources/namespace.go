package kubeResources

import (
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

func ListNamespaces(lister listerscorev1.NamespaceLister) ([]dto.Namespace, error) {
	nss, err := lister.List(labels.Everything())
	if err != nil {
		return nil, err
	}
	result := make([]dto.Namespace, len(nss))
	for i, ns := range nss {
		managedFields := toManagedFields(ns)

		lbls := ns.Labels
		if lbls == nil {
			lbls = map[string]string{}
		}
		annotations := ns.Annotations
		if annotations == nil {
			annotations = map[string]string{}
		}

		result[i] = dto.Namespace{
			Name:           ns.Name,
			Labels:         lbls,
			Annotations:    annotations,
			Age:            humanAge(ns.CreationTimestamp.Time),
			CreatedAt:      ns.CreationTimestamp.UTC().Format(time.RFC3339),
			Status:         string(ns.Status.Phase),
			ManagedFields:  managedFields,
			ResourceQuotas: []string{},
			LimitRanges:    []string{},
		}
	}
	return result, nil
}

func GetNamespaceByName(lister listerscorev1.NamespaceLister, name string) (dto.Namespace, error) {
	ns, err := lister.Get(name)
	if err != nil {
		return dto.Namespace{}, err
	}
	managedFields := toManagedFields(ns)
	lbls := ns.Labels
	if lbls == nil {
		lbls = map[string]string{}
	}
	annotations := ns.Annotations
	if annotations == nil {
		annotations = map[string]string{}
	}
	return dto.Namespace{
		Name:           ns.Name,
		Labels:         lbls,
		Annotations:    annotations,
		Age:            humanAge(ns.CreationTimestamp.Time),
		CreatedAt:      ns.CreationTimestamp.UTC().Format(time.RFC3339),
		Status:         string(ns.Status.Phase),
		ManagedFields:  managedFields,
		ResourceQuotas: []string{},
		LimitRanges:    []string{},
	}, nil
}
