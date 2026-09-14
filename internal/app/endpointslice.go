package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	discoveryv1 "k8s.io/api/discovery/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListEndpointSlices() ([]dto.EndpointSlice, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "endpointslices") {
		return []dto.EndpointSlice{}, nil
	}
	result, err := kubeResources.ListEndpointSlices(h.EndpointSliceLister(), namespaces)
	if err != nil {
		log.Printf("app: ListEndpointSlices: %v", err)
		return []dto.EndpointSlice{}, nil
	}
	return result, nil
}

func (a *App) GetEndpointSliceByName(namespace, name string) (dto.EndpointSlice, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "endpointslices") {
		return dto.EndpointSlice{}, nil
	}
	result, err := kubeResources.GetEndpointSliceByName(h.EndpointSliceLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetEndpointSliceByName: %v", err)
		return dto.EndpointSlice{}, nil
	}
	return result, nil
}

// DeleteEndpointSlice deletes an EndpointSlice from the specified namespace.
func (a *App) DeleteEndpointSlice(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.DiscoveryV1().EndpointSlices(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete EndpointSlice: %w", err)
	}

	// Emit update event after successful delete
	a.emitEndpointSlices()

	return nil
}

// DeleteEndpointSlices deletes multiple EndpointSlices, handling best-effort deletion across namespaces.
func (a *App) DeleteEndpointSlices(items []dto.EndpointSliceRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.EndpointSliceRef) string { return r.Namespace },
		func(r dto.EndpointSliceRef) string { return r.Name },
		"endpointslices",
		func(ctx context.Context, namespace, name string) error {
			return cs.DiscoveryV1().EndpointSlices(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitEndpointSlices()

	return err
}

func (a *App) emitEndpointSlices() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "endpointslices") {
		return
	}
	lister := h.EndpointSliceLister()
	data, err := kubeResources.ListEndpointSlices(lister, namespaces)
	if err != nil {
		log.Printf("app: emitEndpointSlices: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "endpointslices:update", data)
}

func (a *App) GetEndpointSliceYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	es, err := cs.DiscoveryV1().EndpointSlices(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get EndpointSlice: %w", err)
	}

	b, err := sigsyaml.Marshal(es)
	if err != nil {
		return "", fmt.Errorf("marshal EndpointSlice to YAML: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdateEndpointSliceYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var es discoveryv1.EndpointSlice
	err = sigsyaml.Unmarshal([]byte(yamlString), &es)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to EndpointSlice: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.DiscoveryV1().EndpointSlices(namespace).Update(ctx, &es, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update EndpointSlice: %w", err)
	}

	a.emitEndpointSlices()

	return nil
}
