package app

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListIngressClasses() ([]dto.IngressClass, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "ingressclasses") {
		return []dto.IngressClass{}, nil
	}
	result, err := kubeResources.ListIngressClasses(h.Factory.Networking().V1().IngressClasses().Lister())
	if err != nil {
		log.Printf("app: ListIngressClasses: %v", err)
		return []dto.IngressClass{}, nil
	}
	return result, nil
}

func (a *App) GetIngressClassByName(name string) (dto.IngressClass, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "ingressclasses") {
		return dto.IngressClass{}, nil
	}
	result, err := kubeResources.GetIngressClassByName(
		h.Factory.Networking().V1().IngressClasses().Lister(),
		name,
	)
	if err != nil {
		log.Printf("app: GetIngressClassByName: %v", err)
		return dto.IngressClass{}, nil
	}
	return result, nil
}

func (a *App) SetIngressClassAsDefault(name string) error {
	a.mu.RLock()
	cs := a.clients[a.activeContext]
	h := a.factories[a.activeContext]
	a.mu.RUnlock()
	if cs == nil {
		return fmt.Errorf("not connected")
	}
	// Unset any currently-default IngressClasses before setting the new one.
	if h != nil {
		existing, err := kubeResources.ListIngressClasses(h.Factory.Networking().V1().IngressClasses().Lister())
		if err == nil {
			for _, ic := range existing {
				if ic.IsDefault && ic.Name != name {
					ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
					if pErr := applyIngressClassDefault(ctx, cs, ic.Name, "false"); pErr != nil {
						log.Printf("app: SetIngressClassAsDefault: unset %s: %v", ic.Name, pErr)
					}
					cancel()
				}
			}
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	return applyIngressClassDefault(ctx, cs, name, "true")
}

func (a *App) UnsetIngressClassAsDefault(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	return applyIngressClassDefault(ctx, cs, name, "false")
}

func applyIngressClassDefault(ctx context.Context, cs kubernetes.Interface, name, value string) error {
	patchBody := map[string]any{
		"metadata": map[string]any{
			"annotations": map[string]any{
				"ingressclass.kubernetes.io/is-default-class": value,
			},
		},
	}
	patchBytes, err := json.Marshal(patchBody)
	if err != nil {
		return err
	}
	_, err = cs.NetworkingV1().IngressClasses().Patch(
		ctx, name, types.MergePatchType, patchBytes, metav1.PatchOptions{},
	)
	return err
}

func (a *App) DeleteIngressClass(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.NetworkingV1().IngressClasses().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete IngressClass: %w", err)
	}

	a.emitIngressClasses()

	return nil
}

func (a *App) DeleteIngressClasses(items []dto.IngressClassRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		nil,
		func(r dto.IngressClassRef) string { return r.Name },
		"ingressclasses",
		func(ctx context.Context, _, name string) error {
			return cs.NetworkingV1().IngressClasses().Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitIngressClasses()

	return err
}

func (a *App) emitIngressClasses() {
	h := a.activeFactory()
	if !waitForResourceSync(h, "ingressclasses") {
		return
	}
	data, err := kubeResources.ListIngressClasses(h.Factory.Networking().V1().IngressClasses().Lister())
	if err != nil {
		log.Printf("app: emitIngressClasses: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "ingressclasses:update", data)
}

func (a *App) GetIngressClassYAML(name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	ic, err := cs.NetworkingV1().IngressClasses().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get IngressClass: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(ic)
	if err != nil {
		return "", fmt.Errorf("marshal IngressClass to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateIngressClassYAML(yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var ic networkingv1.IngressClass
	err = sigsyaml.Unmarshal([]byte(yamlString), &ic)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to IngressClass: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.NetworkingV1().IngressClasses().Update(ctx, &ic, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update IngressClass: %w", err)
	}

	a.emitIngressClasses()

	return nil
}

// WatchIngressClassDetail registers the frontend's interest in live "ingressclass:update"
// detail pushes for one specific IngressClass (name) — the one currently shown in
// the (single) open IngressClass detail drawer. Call UnwatchIngressClassDetail on
// drawer close/unmount to stop.
func (a *App) WatchIngressClassDetail(name string) {
	a.watchedIngressClass.watch("", name)
}

// UnwatchIngressClassDetail reverses WatchIngressClassDetail.
func (a *App) UnwatchIngressClassDetail(name string) {
	a.watchedIngressClass.unwatch("", name)
}

// emitIngressClassDetail pushes a fresh IngressClass detail on "ingressclass:update" (singular
// — distinct from the "ingressclasses:update" list topic) for the currently-watched
// IngressClass, if any.
func (a *App) emitIngressClassDetail() {
	_, name, ok := a.watchedIngressClass.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSync(h, "ingressclasses") {
		return
	}
	detail, err := kubeResources.GetIngressClassByName(h.Factory.Networking().V1().IngressClasses().Lister(), name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "ingressclass:update", detail)
}
