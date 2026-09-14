package kubeResources

import (
	"log"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

func toServiceAccount(sa *corev1.ServiceAccount) dto.ServiceAccount {
	secrets := make([]string, len(sa.Secrets))
	for i, s := range sa.Secrets {
		secrets[i] = s.Name
	}
	return dto.ServiceAccount{
		Name:      sa.Name,
		Namespace: sa.Namespace,
		Age:       humanAge(sa.CreationTimestamp.Time),
		CreatedAt: sa.CreationTimestamp.UTC().Format(time.RFC3339),
		Secrets:   secrets,
	}
}

func GetServiceAccountByName(saLister listerscorev1.ServiceAccountLister, namespace, name string) (dto.ServiceAccount, error) {
	sa, err := saLister.ServiceAccounts(namespace).Get(name)
	if err != nil {
		return dto.ServiceAccount{}, err
	}
	return toServiceAccount(sa), nil
}

func ListServiceAccounts(saLister listerscorev1.ServiceAccountLister, namespaces []string) ([]dto.ServiceAccount, error) {
	var sas []*corev1.ServiceAccount
	if len(namespaces) == 0 {
		all, err := saLister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		sas = all
	} else {
		for _, ns := range namespaces {
			nsSas, err := saLister.ServiceAccounts(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListServiceAccounts: namespace %q: %v", ns, err)
				continue
			}
			sas = append(sas, nsSas...)
		}
	}
	result := make([]dto.ServiceAccount, len(sas))
	for i, sa := range sas {
		result[i] = toServiceAccount(sa)
	}
	return result, nil
}
