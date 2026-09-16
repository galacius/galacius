package app

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"maps"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	batchv1 "k8s.io/api/batch/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/types"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) GetCronJobByName(namespace, name string) (dto.CronJob, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "cronjobs") {
		return dto.CronJob{}, nil
	}
	result, err := kubeResources.GetCronJobByName(h.CronJobLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetCronJobByName: %v", err)
		return dto.CronJob{}, nil
	}
	return result, nil
}

func (a *App) ListCronJobs() ([]dto.CronJob, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "cronjobs") {
		return []dto.CronJob{}, nil
	}
	result, err := kubeResources.ListCronJobs(h.CronJobLister(), namespaces)
	if err != nil {
		log.Printf("app: ListCronJobs: %v", err)
		return []dto.CronJob{}, nil
	}
	return result, nil
}

func (a *App) GetCronJobsSummary() (dto.CronJobSummary, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "cronjobs") {
		return dto.CronJobSummary{}, nil
	}
	lister := h.CronJobLister()
	var cjs []*batchv1.CronJob
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			log.Printf("app: GetCronJobsSummary: %v", err)
			return dto.CronJobSummary{}, nil
		}
		cjs = all
	} else {
		for _, ns := range namespaces {
			nsCjs, err := lister.CronJobs(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("app: GetCronJobsSummary: namespace %q: %v", ns, err)
				continue
			}
			cjs = append(cjs, nsCjs...)
		}
	}
	return kubeResources.SummarizeCronJobs(cjs), nil
}

func (a *App) emitCronJobs() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "cronjobs") {
		return
	}
	lister := h.CronJobLister()
	data, err := kubeResources.ListCronJobs(lister, namespaces)
	if err != nil {
		log.Printf("app: emitCronJobs: %v", err)
		return
	}
	runtime.EventsEmit(a.ctx, "cronjobs:update", data)
}

// DeleteCronJob deletes a CronJob from the specified namespace.
func (a *App) DeleteCronJob(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.BatchV1().CronJobs(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete CronJob: %w", err)
	}

	// Emit update event after successful delete
	a.emitCronJobs()

	return nil
}

// DeleteCronJobs deletes multiple CronJobs, handling best-effort deletion across namespaces.
func (a *App) DeleteCronJobs(items []dto.CronJobRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.CronJobRef) string { return r.Namespace },
		func(r dto.CronJobRef) string { return r.Name },
		"cronjobs",
		func(ctx context.Context, namespace, name string) error {
			return cs.BatchV1().CronJobs(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitCronJobs()

	return err
}

// SetCronJobSuspend patches a CronJob's spec.suspend field, pausing (true) or resuming
// (false) its schedule without deleting the resource or its Job history.
func (a *App) SetCronJobSuspend(namespace, name string, suspend bool) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	patchBody := map[string]any{
		"spec": map[string]any{"suspend": suspend},
	}
	patchBytes, err := json.Marshal(patchBody)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.BatchV1().CronJobs(namespace).Patch(
		ctx, name, types.MergePatchType, patchBytes, metav1.PatchOptions{},
	)
	if err != nil {
		return fmt.Errorf("set CronJob suspend: %w", err)
	}

	a.emitCronJobs()
	a.emitCronJobDetail()

	return nil
}

// CreateJobFromCronJob triggers an on-demand run of a CronJob by creating a Job from its
// JobTemplate, mirroring `kubectl create job --from=cronjob/<name>`.
func (a *App) CreateJobFromCronJob(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	readCtx, readCancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer readCancel()
	cj, err := cs.BatchV1().CronJobs(namespace).Get(readCtx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("get CronJob: %w", err)
	}

	annotations := map[string]string{
		"cronjob.kubernetes.io/instantiate": "manual",
	}
	maps.Copy(annotations, cj.Spec.JobTemplate.Annotations)

	job := &batchv1.Job{
		GenerateName: fmt.Sprintf("%s-manual-", name),
		Namespace:    namespace,
		Annotations:  annotations,
		Labels:       cj.Spec.JobTemplate.Labels,
		OwnerReferences: []metav1.OwnerReference{
			*metav1.NewControllerRef(cj, batchv1.SchemeGroupVersion.WithKind("CronJob")),
		},
		Spec: cj.Spec.JobTemplate.Spec,
	}

	mutationCtx, mutationCancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer mutationCancel()
	_, err = cs.BatchV1().Jobs(namespace).Create(mutationCtx, job, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("create Job from CronJob: %w", err)
	}

	a.emitJobs()

	return nil
}

func (a *App) GetCronJobYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	cj, err := cs.BatchV1().CronJobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get CronJob: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(cj)
	if err != nil {
		return "", fmt.Errorf("marshal CronJob to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateCronJobYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var cj batchv1.CronJob
	err = sigsyaml.Unmarshal([]byte(yamlString), &cj)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to CronJob: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.BatchV1().CronJobs(namespace).Update(ctx, &cj, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update CronJob: %w", err)
	}

	a.emitCronJobs()

	return nil
}

// WatchCronJobDetail registers the frontend's interest in live "cronjob:update"
// detail pushes for one specific CronJob (namespace/name) — the one currently
// shown in the (single) open CronJob detail drawer. Call UnwatchCronJobDetail
// on drawer close/unmount to stop.
func (a *App) WatchCronJobDetail(namespace, name string) {
	a.watchedCronJob.watch(namespace, name)
}

// UnwatchCronJobDetail reverses WatchCronJobDetail.
func (a *App) UnwatchCronJobDetail(namespace, name string) {
	a.watchedCronJob.unwatch(namespace, name)
}

// emitCronJobDetail pushes a fresh detail on "cronjob:update" (singular — distinct from the
// "cronjobs:update" list topic) for the currently-watched CronJob, if any.
func (a *App) emitCronJobDetail() {
	namespace, name, ok := a.watchedCronJob.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "cronjobs") {
		return
	}
	detail, err := kubeResources.GetCronJobByName(h.CronJobLister(), namespace, name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "cronjob:update", detail)
}
