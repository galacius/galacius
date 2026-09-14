package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListIngresses() ([]dto.Ingress, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "ingresses") {
		return []dto.Ingress{}, nil
	}
	result, err := kubeResources.ListIngresses(h.IngressLister(), namespaces)
	if err != nil {
		log.Printf("app: ListIngresses: %v", err)
		return []dto.Ingress{}, nil
	}
	return result, nil
}

func (a *App) WatchIngressDetail(namespace, name string) {
	a.watchedIngress.watch(namespace, name)
}

func (a *App) UnwatchIngressDetail(namespace, name string) {
	a.watchedIngress.unwatch(namespace, name)
}

func (a *App) emitIngressDetail() {
	namespace, name, ok := a.watchedIngress.get()
	if !ok {
		return
	}
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "ingresses") {
		return
	}
	detail, err := kubeResources.GetIngressByName(h.IngressLister(), namespace, name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "ingress:update", detail)
}

func (a *App) GetIngressByName(namespace, name string) (dto.IngressDetail, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "ingresses") {
		return dto.IngressDetail{}, nil
	}
	result, err := kubeResources.GetIngressByName(h.IngressLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetIngressByName: %v", err)
		return dto.IngressDetail{}, nil
	}
	return result, nil
}

// DeleteIngress deletes an Ingress from the specified namespace.
func (a *App) DeleteIngress(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.NetworkingV1().Ingresses(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete Ingress: %w", err)
	}

	// Emit update event after successful delete
	a.emitIngresses()

	return nil
}

// DeleteIngresses deletes multiple Ingresses, handling best-effort deletion across namespaces.
func (a *App) DeleteIngresses(items []dto.IngressRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.IngressRef) string { return r.Namespace },
		func(r dto.IngressRef) string { return r.Name },
		"ingresses",
		func(ctx context.Context, namespace, name string) error {
			return cs.NetworkingV1().Ingresses(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitIngresses()

	return err
}

func (a *App) emitIngresses() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "ingresses") {
		return
	}
	lister := h.IngressLister()
	data, err := kubeResources.ListIngresses(lister, namespaces)
	if err != nil {
		log.Printf("app: emitIngresses: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "ingresses:update", data)
}

func (a *App) GetIngressYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	ing, err := cs.NetworkingV1().Ingresses(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get Ingress: %w", err)
	}

	b, err := sigsyaml.Marshal(ing)
	if err != nil {
		return "", fmt.Errorf("marshal Ingress to YAML: %w", err)
	}

	return string(b), nil
}

func (a *App) UpdateIngressYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var ing networkingv1.Ingress
	err = sigsyaml.Unmarshal([]byte(yamlString), &ing)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to Ingress: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.NetworkingV1().Ingresses(namespace).Update(ctx, &ing, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Ingress: %w", err)
	}

	a.emitIngresses()

	return nil
}
