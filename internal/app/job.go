package app

import (
	"context"
	"fmt"
	"log"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	batchv1 "k8s.io/api/batch/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	sigsyaml "sigs.k8s.io/yaml"
)

func (a *App) GetJobByName(namespace, name string) (dto.Job, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "jobs") {
		return dto.Job{}, nil
	}
	result, err := kubeResources.GetJobByName(h.JobLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetJobByName: %v", err)
		return dto.Job{}, nil
	}
	return result, nil
}

func (a *App) ListJobs() ([]dto.Job, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "jobs") {
		return []dto.Job{}, nil
	}
	result, err := kubeResources.ListJobs(h.JobLister(), namespaces)
	if err != nil {
		log.Printf("app: ListJobs: %v", err)
		return []dto.Job{}, nil
	}
	return result, nil
}

func (a *App) GetJobsSummary() (dto.JobSummary, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "jobs") {
		return dto.JobSummary{}, nil
	}
	lister := h.JobLister()
	var jobs []*batchv1.Job
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			log.Printf("app: GetJobsSummary: %v", err)
			return dto.JobSummary{}, nil
		}
		jobs = all
	} else {
		for _, ns := range namespaces {
			nsJobs, err := lister.Jobs(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("app: GetJobsSummary: namespace %q: %v", ns, err)
				continue
			}
			jobs = append(jobs, nsJobs...)
		}
	}
	return kubeResources.SummarizeJobs(jobs), nil
}

func (a *App) emitJobs() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "jobs") {
		return
	}
	lister := h.JobLister()
	data, err := kubeResources.ListJobs(lister, namespaces)
	if err != nil {
		log.Printf("app: emitJobs: %v", err)
		return
	}
	a.emitPump.Enqueue("jobs:update", func() any { return data })
}

// DeleteJob deletes a Job from the specified namespace.
func (a *App) DeleteJob(namespace, name string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	err = cs.BatchV1().Jobs(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("delete Job: %w", err)
	}

	// Emit update event after successful delete
	a.emitJobs()

	return nil
}

// DeleteJobs deletes multiple Jobs, handling best-effort deletion across namespaces.
func (a *App) DeleteJobs(items []dto.JobRef) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	err = deleteRefsBestEffort(items,
		func(r dto.JobRef) string { return r.Namespace },
		func(r dto.JobRef) string { return r.Name },
		"jobs",
		func(ctx context.Context, namespace, name string) error {
			return cs.BatchV1().Jobs(namespace).Delete(ctx, name, metav1.DeleteOptions{})
		},
	)

	a.emitJobs()

	return err
}

func (a *App) GetJobYAML(namespace, name string) (string, error) {
	cs, err := a.activeClientset()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiReadTimeout)
	defer cancel()
	job, err := cs.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get Job: %w", err)
	}

	yamlBytes, err := sigsyaml.Marshal(job)
	if err != nil {
		return "", fmt.Errorf("marshal Job to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

func (a *App) UpdateJobYAML(namespace, yamlString string) error {
	cs, err := a.activeClientset()
	if err != nil {
		return err
	}

	var job batchv1.Job
	err = sigsyaml.Unmarshal([]byte(yamlString), &job)
	if err != nil {
		return fmt.Errorf("unmarshal YAML to Job: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), apiMutationTimeout)
	defer cancel()
	_, err = cs.BatchV1().Jobs(namespace).Update(ctx, &job, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("update Job: %w", err)
	}

	a.emitJobs()

	return nil
}

// WatchJobDetail registers the frontend's interest in live "job:update"
// detail pushes for one specific Job (namespace/name) — the one currently
// shown in the (single) open Job detail drawer. Call UnwatchJobDetail
// on drawer close/unmount to stop.
func (a *App) WatchJobDetail(namespace, name string) {
	a.watchedJob.watch(namespace, name)
}

// UnwatchJobDetail reverses WatchJobDetail.
func (a *App) UnwatchJobDetail(namespace, name string) {
	a.watchedJob.unwatch(namespace, name)
}

// emitJobDetail pushes a fresh detail on "job:update" (singular — distinct from the
// "jobs:update" list topic) for the currently-watched Job, if any.
func (a *App) emitJobDetail() {
	namespace, name, ok := a.watchedJob.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "jobs") {
		return
	}
	detail, err := kubeResources.GetJobByName(h.JobLister(), namespace, name)
	if err != nil {
		return
	}
	a.emitPump.Enqueue("job:update", func() any { return detail })
}
