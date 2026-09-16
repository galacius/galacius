package kubeResources

import (
	"log"
	"sort"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	coordinationv1 "k8s.io/api/coordination/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscoordinationv1 "k8s.io/client-go/listers/coordination/v1"
)

func toLease(l *coordinationv1.Lease) dto.Lease {
	holderIdentity := ""
	if l.Spec.HolderIdentity != nil {
		holderIdentity = *l.Spec.HolderIdentity
	}

	var leaseDurationSeconds int32
	if l.Spec.LeaseDurationSeconds != nil {
		leaseDurationSeconds = *l.Spec.LeaseDurationSeconds
	}

	var leaseTransitions int32
	if l.Spec.LeaseTransitions != nil {
		leaseTransitions = *l.Spec.LeaseTransitions
	}

	renewTime := ""
	if l.Spec.RenewTime != nil {
		renewTime = l.Spec.RenewTime.UTC().Format(time.RFC3339)
	}

	acquireTime := ""
	if l.Spec.AcquireTime != nil {
		acquireTime = l.Spec.AcquireTime.UTC().Format(time.RFC3339)
	}

	managedFields := toManagedFields(l)

	return dto.Lease{
		Name:                 l.Name,
		Namespace:            l.Namespace,
		HolderIdentity:       holderIdentity,
		LeaseDurationSeconds: leaseDurationSeconds,
		RenewTime:            renewTime,
		AcquireTime:          acquireTime,
		LeaseTransitions:     leaseTransitions,
		Age:                  humanAge(l.CreationTimestamp.Time),
		CreatedAt:            l.CreationTimestamp.UTC().Format(time.RFC3339),
		Labels:               l.Labels,
		Annotations:          l.Annotations,
		ManagedFields:        managedFields,
	}
}

func ListLeases(lister listerscoordinationv1.LeaseLister, namespaces []string) ([]dto.Lease, error) {
	var leases []*coordinationv1.Lease
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		leases = all
	} else {
		for _, ns := range namespaces {
			nsLeases, err := lister.Leases(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListLeases: namespace %q: %v", ns, err)
				continue
			}
			leases = append(leases, nsLeases...)
		}
	}
	result := make([]dto.Lease, len(leases))
	for i, l := range leases {
		result[i] = toLease(l)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})
	return result, nil
}

func GetLeaseByName(lister listerscoordinationv1.LeaseLister, namespace, name string) (dto.Lease, error) {
	lease, err := lister.Leases(namespace).Get(name)
	if err != nil {
		return dto.Lease{}, err
	}
	return toLease(lease), nil
}
