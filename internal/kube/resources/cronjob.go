package kubeResources

import (
	"fmt"
	"log"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	batchv1 "k8s.io/api/batch/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersbatchv1 "k8s.io/client-go/listers/batch/v1"
)

func toCronJob(cj *batchv1.CronJob) dto.CronJob {
	suspend := cj.Spec.Suspend != nil && *cj.Spec.Suspend

	timezone := ""
	if cj.Spec.TimeZone != nil {
		timezone = *cj.Spec.TimeZone
	}

	lastSchedule := ""
	lastScheduleAt := ""
	if cj.Status.LastScheduleTime != nil {
		lastSchedule = humanAge(cj.Status.LastScheduleTime.Time)
		lastScheduleAt = cj.Status.LastScheduleTime.Format(time.RFC3339)
	}

	lastSuccessfulTime := ""
	lastSuccessfulTimeAt := ""
	if cj.Status.LastSuccessfulTime != nil {
		lastSuccessfulTime = humanAge(cj.Status.LastSuccessfulTime.Time)
		lastSuccessfulTimeAt = cj.Status.LastSuccessfulTime.Format(time.RFC3339)
	}

	successfulJobsHistoryLimit := 3
	if cj.Spec.SuccessfulJobsHistoryLimit != nil {
		successfulJobsHistoryLimit = int(*cj.Spec.SuccessfulJobsHistoryLimit)
	}

	failedJobsHistoryLimit := 1
	if cj.Spec.FailedJobsHistoryLimit != nil {
		failedJobsHistoryLimit = int(*cj.Spec.FailedJobsHistoryLimit)
	}

	jobParallelism := 0
	if cj.Spec.JobTemplate.Spec.Parallelism != nil {
		jobParallelism = int(*cj.Spec.JobTemplate.Spec.Parallelism)
	}

	jobCompletions := "0"
	if cj.Spec.JobTemplate.Spec.Completions != nil {
		jobCompletions = fmt.Sprintf("%d", *cj.Spec.JobTemplate.Spec.Completions)
	}

	jobSuspend := false
	if cj.Spec.JobTemplate.Spec.Suspend != nil {
		jobSuspend = *cj.Spec.JobTemplate.Spec.Suspend
	}

	var jobTTL int32
	if cj.Spec.JobTemplate.Spec.TTLSecondsAfterFinished != nil {
		jobTTL = *cj.Spec.JobTemplate.Spec.TTLSecondsAfterFinished
	}

	annotations := map[string]string{}
	if cj.Annotations != nil {
		annotations = cj.Annotations
	}

	managedFields := toManagedFields(cj)

	return dto.CronJob{
		Name:         cj.Name,
		Namespace:    cj.Namespace,
		Schedule:     cj.Spec.Schedule,
		Timezone:     timezone,
		Suspend:      suspend,
		Active:       len(cj.Status.Active),
		LastSchedule: lastSchedule,
		Age:          humanAge(cj.CreationTimestamp.Time),

		CreatedAt:                  cj.CreationTimestamp.Format(time.RFC3339),
		Annotations:                annotations,
		ManagedFields:              managedFields,
		ConcurrencyPolicy:          string(cj.Spec.ConcurrencyPolicy),
		SuccessfulJobsHistoryLimit: successfulJobsHistoryLimit,
		FailedJobsHistoryLimit:     failedJobsHistoryLimit,
		LastSuccessfulTime:         lastSuccessfulTime,
		LastSuccessfulTimeAt:       lastSuccessfulTimeAt,
		LastScheduleAt:             lastScheduleAt,
		JobParallelism:             jobParallelism,
		JobCompletions:             jobCompletions,
		JobSuspend:                 jobSuspend,
		JobTTLSecondsAfterFinished: jobTTL,
	}
}

func GetCronJobByName(lister listersbatchv1.CronJobLister, namespace, name string) (dto.CronJob, error) {
	cj, err := lister.CronJobs(namespace).Get(name)
	if err != nil {
		return dto.CronJob{}, err
	}
	return toCronJob(cj), nil
}

func ListCronJobs(lister listersbatchv1.CronJobLister, namespaces []string) ([]dto.CronJob, error) {
	var cjs []*batchv1.CronJob
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		cjs = all
	} else {
		for _, ns := range namespaces {
			nsCjs, err := lister.CronJobs(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListCronJobs: namespace %q: %v", ns, err)
				continue
			}
			cjs = append(cjs, nsCjs...)
		}
	}
	result := make([]dto.CronJob, len(cjs))
	for i, cj := range cjs {
		result[i] = toCronJob(cj)
	}
	return result, nil
}

func SummarizeCronJobs(cjs []*batchv1.CronJob) dto.CronJobSummary {
	summary := dto.CronJobSummary{}
	for _, cj := range cjs {
		if cj.Spec.Suspend != nil && *cj.Spec.Suspend {
			summary.Suspended++
		} else {
			summary.Scheduled++
		}
	}
	return summary
}
