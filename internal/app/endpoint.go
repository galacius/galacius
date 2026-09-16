package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListEndpoints() ([]dto.Endpoint, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "endpoints") {
		return []dto.Endpoint{}, nil
	}
	result, err := kubeResources.ListEndpoints(h.EndpointsLister(), namespaces)
	if err != nil {
		log.Printf("app: ListEndpoints: %v", err)
		return []dto.Endpoint{}, nil
	}
	return result, nil
}

func (a *App) GetEndpointByName(namespace, name string) (dto.Endpoint, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "endpoints") {
		return dto.Endpoint{}, nil
	}
	result, err := kubeResources.GetEndpointByName(h.EndpointsLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetEndpointByName: %v", err)
		return dto.Endpoint{}, nil
	}
	return result, nil
}

// DeleteEndpoint deletes an Endpoint from the specified namespace.
func (a *App) DeleteEndpoint(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoreV1().Endpoints(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete Endpoint: %w", err)
	}

	// Emit update event after successful delete
	a.emitEndpoints()

	return nil
}

// DeleteEndpoints deletes multiple Endpoints, handling best-effort deletion across namespaces.
func (a *App) DeleteEndpoints(items []dto.EndpointRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.EndpointRef) string { return r.Namespace },
		func(r dto.EndpointRef) string { return r.Name },
		"endpoints",
		func(ctx context.Context, namespace, name string) error {
			return cs.CoreV1().Endpoints(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitEndpoints()

	return err
}

func (a *App) emitEndpoints() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "endpoints") {
		return
	}
	lister := h.EndpointsLister()
	data, err := kubeResources.ListEndpoints(lister, namespaces)
	if err != nil {
		log.Printf("app: emitEndpoints: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "endpoints:update", data)
}

func (a *App) GetEndpointYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	ep, err := cs.CoreV1().Endpoints(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get Endpoint: %w", err)
	}

	b, err := sigsyaml.Marshal(ep)
	if err != nil {
		return "", fmt.Errorf("marshal Endpoint to YAML: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdateEndpointYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	//lint:ignore SA1019 legacy Endpoints API still supported alongside EndpointSlice; UpdateEndpointYAML edits the resource kind the user is viewing
	var ep corev1.Endpoints
	err = sigsyaml.Unmarshal([]byte(yamlString), &ep)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to Endpoint: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().Endpoints(namespace).Update(ctx, &ep, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Endpoint: %w", err)
	}

	a.emitEndpoints()

	return nil
}

// WatchEndpointDetail registers the frontend's interest in live "endpoint:update"
// detail pushes for one specific Endpoint (namespace/name) — the one currently
// shown in the (single) open Endpoint detail drawer. Call UnwatchEndpointDetail
// on drawer close/unmount to stop.
func (a *App) WatchEndpointDetail(namespace, name string) {
	a.watchedEndpoint.watch(namespace, name)
}

// UnwatchEndpointDetail reverses WatchEndpointDetail.
func (a *App) UnwatchEndpointDetail(namespace, name string) {
	a.watchedEndpoint.unwatch(namespace, name)
}

// emitEndpointDetail pushes a fresh detail on "endpoint:update" (singular — distinct from the
// "endpoints:update" list topic) for the currently-watched Endpoint, if any.
func (a *App) emitEndpointDetail() {
	namespace, name, ok := a.watchedEndpoint.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "endpoints") {
		return
	}
	detail, err := kubeResources.GetEndpointByName(h.EndpointsLister(), namespace, name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "endpoint:update", detail)
}
