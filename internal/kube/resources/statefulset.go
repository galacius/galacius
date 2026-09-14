package kubeResources

import (
	"fmt"
	"log"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersappsv1 "k8s.io/client-go/listers/apps/v1"
)

// statefulSetHealth mirrors Argo CD's health assessment for StatefulSets
// (gitops-engine's getAppsv1StatefulSetHealth, itself borrowed from
// kubectl's rollout_status.go), verified against upstream source at
// github.com/argoproj/gitops-engine/pkg/health/health_statefulset.go.
func statefulSetHealth(ss *appsv1.StatefulSet) (status, message string) {
	if ss.Status.ObservedGeneration == 0 || ss.Generation > ss.Status.ObservedGeneration {
		return "Progressing", "Waiting for statefulset spec update to be observed..."
	}
	if ss.Spec.Replicas != nil && ss.Status.ReadyReplicas < *ss.Spec.Replicas {
		return "Progressing", fmt.Sprintf("Waiting for %d pods to be ready...", *ss.Spec.Replicas-ss.Status.ReadyReplicas)
	}
	if ss.Spec.UpdateStrategy.Type == appsv1.RollingUpdateStatefulSetStrategyType && ss.Spec.UpdateStrategy.RollingUpdate != nil {
		if ss.Spec.Replicas != nil && ss.Spec.UpdateStrategy.RollingUpdate.Partition != nil {
			target := *ss.Spec.Replicas - *ss.Spec.UpdateStrategy.RollingUpdate.Partition
			if ss.Status.UpdatedReplicas < target {
				return "Progressing", fmt.Sprintf(
					"Waiting for partitioned roll out to finish: %d out of %d new pods have been updated...",
					ss.Status.UpdatedReplicas, target)
			}
		}
		return "Healthy", fmt.Sprintf("partitioned roll out complete: %d new pods have been updated...", ss.Status.UpdatedReplicas)
	}
	if ss.Spec.UpdateStrategy.Type == appsv1.OnDeleteStatefulSetStrategyType {
		return "Healthy", fmt.Sprintf("statefulset has %d ready pods", ss.Status.ReadyReplicas)
	}
	if ss.Status.UpdateRevision != ss.Status.CurrentRevision {
		return "Progressing", fmt.Sprintf(
			"waiting for statefulset rolling update to complete %d pods at revision %s...",
			ss.Status.UpdatedReplicas, ss.Status.UpdateRevision)
	}
	return "Healthy", fmt.Sprintf("statefulset rolling update complete %d pods at revision %s...", ss.Status.CurrentReplicas, ss.Status.CurrentRevision)
}

func toStatefulSet(ss *appsv1.StatefulSet) dto.StatefulSet {
	var replicas int32 = 1
	if ss.Spec.Replicas != nil {
		replicas = *ss.Spec.Replicas
	}
	healthStatus, healthMessage := statefulSetHealth(ss)
	return dto.StatefulSet{
		Name:      ss.Name,
		Namespace: ss.Namespace,
		Pods:      fmt.Sprintf("%d/%d", ss.Status.ReadyReplicas, replicas),
		Replicas:  replicas,
		Age:       humanAge(ss.CreationTimestamp.Time),
		CreatedAt: ss.CreationTimestamp.Format(time.RFC3339),
		Labels: func() map[string]string {
			if ss.Labels == nil {
				return map[string]string{}
			}
			return ss.Labels
		}(),
		Annotations: func() map[string]string {
			if ss.Annotations == nil {
				return map[string]string{}
			}
			return ss.Annotations
		}(),
		ManagedFields: toManagedFields(ss),
		Selector: func() map[string]string {
			if ss.Spec.Selector == nil || ss.Spec.Selector.MatchLabels == nil {
				return map[string]string{}
			}
			return ss.Spec.Selector.MatchLabels
		}(),
		Images: func() []string {
			out := make([]string, 0, len(ss.Spec.Template.Spec.Containers))
			for _, c := range ss.Spec.Template.Spec.Containers {
				out = append(out, c.Image)
			}
			return out
		}(),
		Affinities: func() int {
			if ss.Spec.Template.Spec.Affinity != nil {
				return 1
			}
			return 0
		}(),
		PodStatus:     fmt.Sprintf("%d desired, %d ready, %d available", replicas, ss.Status.ReadyReplicas, ss.Status.AvailableReplicas),
		HealthStatus:  healthStatus,
		HealthMessage: healthMessage,
	}
}

func ListStatefulSets(lister listersappsv1.StatefulSetLister, namespaces []string) ([]dto.StatefulSet, error) {
	var sss []*appsv1.StatefulSet
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		sss = all
	} else {
		for _, ns := range namespaces {
			nsStatefulSets, err := lister.StatefulSets(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListStatefulSets: namespace %q: %v", ns, err)
				continue
			}
			sss = append(sss, nsStatefulSets...)
		}
	}
	result := make([]dto.StatefulSet, len(sss))
	for i, ss := range sss {
		result[i] = toStatefulSet(ss)
	}
	return result, nil
}

func SummarizeStatefulSets(sss []*appsv1.StatefulSet) dto.StatefulSetSummary {
	summary := dto.StatefulSetSummary{}
	for _, ss := range sss {
		desired := ss.Status.Replicas
		ready := ss.Status.ReadyReplicas
		if desired > 0 && ready >= desired {
			summary.Running++
		} else {
			summary.Pending++
		}
	}
	return summary
}

func GetStatefulSetByName(lister listersappsv1.StatefulSetLister, namespace, name string) (dto.StatefulSet, error) {
	ss, err := lister.StatefulSets(namespace).Get(name)
	if err != nil {
		return dto.StatefulSet{}, err
	}
	return toStatefulSet(ss), nil
}
