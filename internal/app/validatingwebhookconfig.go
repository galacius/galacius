package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) ListValidatingWebhookConfigs() ([]dto.ValidatingWebhookConfig, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "validatingwebhookconfigs") {
		return []dto.ValidatingWebhookConfig{}, nil
	}
	result, err := kubeResources.ListValidatingWebhookConfigs(h.Factory.Admissionregistration().V1().ValidatingWebhookConfigurations().Lister())
	if err != nil {
		log.Printf("app: ListValidatingWebhookConfigs: %v", err)
		return []dto.ValidatingWebhookConfig{}, nil
	}
	return result, nil
}

func (a *App) WatchValidatingWebhookConfigDetail(name string) {
	a.watchedValidatingWebhookConfig.watch("", name)
}

func (a *App) UnwatchValidatingWebhookConfigDetail(name string) {
	a.watchedValidatingWebhookConfig.unwatch("", name)
}

func (a *App) emitValidatingWebhookConfigDetail() {
	_, name, ok := a.watchedValidatingWebhookConfig.get()
	if !ok {
		return
	}
	h := a.activeFactory()
	if !waitForResourceSync(h, "validatingwebhookconfigs") {
		return
	}
	detail, err := kubeResources.GetValidatingWebhookConfigByName(
		h.Factory.Admissionregistration().V1().ValidatingWebhookConfigurations().Lister(),
		name,
	)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "validatingwebhookconfig:update", detail)
}

func (a *App) GetValidatingWebhookConfigByName(name string) (*dto.ValidatingWebhookConfigDetail, error) {
	h := a.activeFactory()
	if !waitForResourceSync(h, "validatingwebhookconfigs") {
		return nil, nil
	}
	result, err := kubeResources.GetValidatingWebhookConfigByName(
		h.Factory.Admissionregistration().V1().ValidatingWebhookConfigurations().Lister(),
		name,
	)
	if err != nil {
		log.Printf("app: GetValidatingWebhookConfigByName: %v", err)
		return nil, err
	}
	return result, nil
}

func (a *App) DeleteValidatingWebhookConfig(name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.AdmissionregistrationV1().ValidatingWebhookConfigurations().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete ValidatingWebhookConfig: %w", err)
	}

	a.emitValidatingWebhookConfigs()

	return nil
}

// DeleteValidatingWebhookConfigs deletes multiple ValidatingWebhookConfigs, handling best-effort deletion.
func (a *App) DeleteValidatingWebhookConfigs(names []string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(names,
		nil,
		func(name string) string { return name },
		"validatingwebhookconfigs",
		func(ctx context.Context, _, name string) error {
			return cs.AdmissionregistrationV1().ValidatingWebhookConfigurations().Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitValidatingWebhookConfigs()

	return err
}

func (a *App) emitValidatingWebhookConfigs() {
	h := a.activeFactory()
	if !waitForResourceSync(h, "validatingwebhookconfigs") {
		return
	}
	data, err := kubeResources.ListValidatingWebhookConfigs(h.Factory.Admissionregistration().V1().ValidatingWebhookConfigurations().Lister())
	if err != nil {
		log.Printf("app: emitValidatingWebhookConfigs: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "validatingwebhookconfigs:update", data)
}

func (a *App) GetValidatingWebhookConfigYAML(name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	vwc, err := cs.AdmissionregistrationV1().ValidatingWebhookConfigurations().Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get ValidatingWebhookConfig: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(vwc)
	if err != nil {
		return "", fmt.Errorf("marshal ValidatingWebhookConfig to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateValidatingWebhookConfigYAML(yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var vwc admissionregistrationv1.ValidatingWebhookConfiguration
	err = sigsyaml.Unmarshal([]byte(yamlString), &vwc)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to ValidatingWebhookConfig: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.AdmissionregistrationV1().ValidatingWebhookConfigurations().Update(ctx, &vwc, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update ValidatingWebhookConfig: %w", err)
	}

	a.emitValidatingWebhookConfigs()

	return nil
}
