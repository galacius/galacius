package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	coordinationv1 "k8s.io/api/coordination/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListLeases() ([]dto.Lease, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "leases") {
		return []dto.Lease{}, nil
	}
	result, err := kubeResources.ListLeases(h.LeaseLister(), namespaces)
	if err != nil {
		log.Printf("app: ListLeases: %v", err)
		return []dto.Lease{}, nil
	}
	return result, nil
}

func (a *App) GetLeaseByName(namespace, name string) (dto.Lease, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "leases") {
		return dto.Lease{}, nil
	}
	result, err := kubeResources.GetLeaseByName(h.LeaseLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetLeaseByName: %v", err)
		return dto.Lease{}, nil
	}
	return result, nil
}

func (a *App) DeleteLease(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoordinationV1().Leases(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete Lease: %w", err)
	}

	a.emitLeases()

	return nil
}

func (a *App) DeleteLeases(items []dto.LeaseRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.LeaseRef) string { return r.Namespace },
		func(r dto.LeaseRef) string { return r.Name },
		"leases",
		func(ctx context.Context, namespace, name string) error {
			return cs.CoordinationV1().Leases(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitLeases()

	return err
}

func (a *App) emitLeases() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "leases") {
		return
	}
	lister := h.LeaseLister()
	data, err := kubeResources.ListLeases(lister, namespaces)
	if err != nil {
		log.Printf("app: emitLeases: %v", err)
		return
	}
	a.emitPump.Enqueue("leases:update", func() any { return data })
}

func (a *App) GetLeaseYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	lease, err := cs.CoordinationV1().Leases(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get Lease: %w", err)
	}

	b, err := sigsyaml.Marshal(lease)
	if err != nil {
		return "", fmt.Errorf("marshal Lease: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdateLeaseYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var lease coordinationv1.Lease
	err = sigsyaml.Unmarshal([]byte(yamlString), &lease)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to Lease: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoordinationV1().Leases(namespace).Update(ctx, &lease, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Lease: %w", err)
	}

	a.emitLeases()

	return nil
}
