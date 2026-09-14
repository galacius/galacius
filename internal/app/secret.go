package app

import (
	"context"
	"encoding/base64"
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

// WatchSecretDetail registers the frontend's interest in live "secret:update"
// detail pushes for one specific Secret (namespace/name) — the one currently
// shown in the (single) open Secret detail drawer. Call UnwatchSecretDetail
// on drawer close/unmount to stop. Until watched, this Secret's full detail
// (including decoded Data) is never pushed — only fetched on-demand via
// GetSecretByName — so watching is opt-in per resource rather than broadcast
// to every Secrets list subscriber.
func (a *App) WatchSecretDetail(namespace, name string) {
	a.watchedSecret.watch(namespace, name)
}

// UnwatchSecretDetail reverses WatchSecretDetail.
func (a *App) UnwatchSecretDetail(namespace, name string) {
	a.watchedSecret.unwatch(namespace, name)
}

// emitSecretDetail pushes a fresh dto.SecretDetail on "secret:update"
// (singular — distinct from the "secrets:update" list topic) for the
// currently-watched Secret, if any. Mirrors emitSecrets but is intentionally
// not called from within it: it's wired to run off the same informer-change
// signal independently, so detail-route consumers aren't coupled to the list
// emit path.
func (a *App) emitSecretDetail() {
	namespace, name, ok := a.watchedSecret.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "secrets") {
		return
	}
	detail, err := kubeResources.GetSecretByName(h.SecretLister(), namespace, name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "secret:update", detail)
}

func (a *App) ListSecrets() ([]dto.Secret, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "secrets") {
		return []dto.Secret{}, nil
	}
	result, err := kubeResources.ListSecrets(h.SecretLister(), namespaces)
	if err != nil {
		log.Printf("app: ListSecrets: %v", err)
		return []dto.Secret{}, nil
	}
	return result, nil
}

func (a *App) GetSecretByName(namespace, name string) (*dto.SecretDetail, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "secrets") {
		return &dto.SecretDetail{}, nil
	}
	result, err := kubeResources.GetSecretByName(
		h.SecretLister(),
		namespace,
		name,
	)
	if err != nil {
		log.Printf("app: GetSecretByName: %v", err)
		return &dto.SecretDetail{}, nil
	}
	return result, nil
}

func (a *App) UpdateSecret(namespace, name string, data map[string]string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	secret, err := cs.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return err
	}
	newData := make(map[string][]byte, len(data))
	for k, v := range data {
		decoded, err := base64.StdEncoding.DecodeString(v)
		if err != nil {
			return fmt.Errorf("invalid base64 for key %q: %w", k, err)
		}
		newData[k] = decoded
	}
	secret.Data = newData
	_, err = cs.CoreV1().Secrets(namespace).Update(ctx, secret, metav1.UpdateOptions{})
	return err
}

func (a *App) DeleteSecret(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.CoreV1().Secrets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete Secret: %w", err)
	}

	a.emitSecrets()

	return nil
}

// DeleteSecrets deletes multiple Secrets, handling best-effort deletion across namespaces.
func (a *App) DeleteSecrets(items []dto.SecretRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.SecretRef) string { return r.Namespace },
		func(r dto.SecretRef) string { return r.Name },
		"secrets",
		func(ctx context.Context, namespace, name string) error {
			return cs.CoreV1().Secrets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitSecrets()

	return err
}

func (a *App) emitSecrets() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "secrets") {
		return
	}
	lister := h.SecretLister()
	data, err := kubeResources.ListSecrets(lister, namespaces)
	if err != nil {
		log.Printf("app: emitSecrets: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "secrets:update", data)
}

func (a *App) GetSecretYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	secret, err := cs.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get Secret: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(secret)
	if err != nil {
		return "", fmt.Errorf("marshal Secret to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateSecretYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var secret corev1.Secret
	err = sigsyaml.Unmarshal([]byte(yamlString), &secret)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to Secret: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.CoreV1().Secrets(namespace).Update(ctx, &secret, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Secret: %w", err)
	}

	a.emitSecrets()

	return nil
}
