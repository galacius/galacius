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

// replicaSetHealth mirrors Argo CD's health assessment for ReplicaSets
// (gitops-engine's getAppsv1ReplicaSetHealth), verified against upstream source
// at github.com/argoproj/gitops-engine/pkg/health/health_replicaset.go: a
// ReplicaFailure condition takes priority over a still-progressing rollout,
// and readiness is judged by AvailableReplicas (respects minReadySeconds), not
// ReadyReplicas.
func replicaSetHealth(rs *appsv1.ReplicaSet, desired int32) (status, message string) {
	if rs.Generation > rs.Status.ObservedGeneration {
		return "Progressing", "Waiting for rollout to finish: observed replica set generation less than desired generation"
	}
	for _, c := range rs.Status.Conditions {
		if c.Type == appsv1.ReplicaSetReplicaFailure && c.Status == "True" {
			return "Degraded", c.Message
		}
	}
	if rs.Status.AvailableReplicas < desired {
		return "Progressing", fmt.Sprintf(
			"Waiting for rollout to finish: %d out of %d new replicas are available...",
			rs.Status.AvailableReplicas, desired)
	}
	return "Healthy", ""
}

func toReplicaSet(rs *appsv1.ReplicaSet) dto.ReplicaSet {
	var desired int32
	if rs.Spec.Replicas != nil {
		desired = *rs.Spec.Replicas
	}
	healthStatus, healthMessage := replicaSetHealth(rs, desired)
	return dto.ReplicaSet{
		Name:      rs.Name,
		Namespace: rs.Namespace,
		Desired:   desired,
		Current:   rs.Status.Replicas,
		Ready:     rs.Status.ReadyReplicas,
		Age:       humanAge(rs.CreationTimestamp.Time),
		OwnerName: func() string {
			if len(rs.OwnerReferences) > 0 {
				return rs.OwnerReferences[0].Name
			}
			return ""
		}(),
		CreatedAt: rs.CreationTimestamp.Format(time.RFC3339),
		OwnerKind: func() string {
			if len(rs.OwnerReferences) > 0 {
				return rs.OwnerReferences[0].Kind
			}
			return ""
		}(),
		Labels: func() map[string]string {
			if rs.Labels == nil {
				return map[string]string{}
			}
			return rs.Labels
		}(),
		Annotations: func() map[string]string {
			if rs.Annotations == nil {
				return map[string]string{}
			}
			return rs.Annotations
		}(),
		ManagedFields: toManagedFields(rs),
		Selector: func() map[string]string {
			if rs.Spec.Selector == nil || rs.Spec.Selector.MatchLabels == nil {
				return map[string]string{}
			}
			return rs.Spec.Selector.MatchLabels
		}(),
		NodeSelector: func() map[string]string {
			if rs.Spec.Template.Spec.NodeSelector == nil {
				return map[string]string{}
			}
			return rs.Spec.Template.Spec.NodeSelector
		}(),
		Images: func() []string {
			out := make([]string, 0, len(rs.Spec.Template.Spec.Containers))
			for _, c := range rs.Spec.Template.Spec.Containers {
				out = append(out, c.Image)
			}
			return out
		}(),
		ReplicasDetail: fmt.Sprintf("%d current / %d desired", rs.Status.Replicas, desired),
		Tolerations:    len(rs.Spec.Template.Spec.Tolerations),
		Affinities: func() int {
			if rs.Spec.Template.Spec.Affinity != nil {
				return 1
			}
			return 0
		}(),
		PodStatus: fmt.Sprintf("%d desired, %d ready, %d available",
			desired, rs.Status.ReadyReplicas, rs.Status.AvailableReplicas),
		HealthStatus:  healthStatus,
		HealthMessage: healthMessage,
	}
}

func GetReplicaSetByName(lister listersappsv1.ReplicaSetLister, namespace, name string) (dto.ReplicaSet, error) {
	rs, err := lister.ReplicaSets(namespace).Get(name)
	if err != nil {
		return dto.ReplicaSet{}, err
	}
	return toReplicaSet(rs), nil
}

func ListReplicaSets(lister listersappsv1.ReplicaSetLister, namespaces []string) ([]dto.ReplicaSet, error) {
	var rss []*appsv1.ReplicaSet
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		rss = all
	} else {
		for _, ns := range namespaces {
			nsRss, err := lister.ReplicaSets(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListReplicaSets: namespace %q: %v", ns, err)
				continue
			}
			rss = append(rss, nsRss...)
		}
	}
	result := make([]dto.ReplicaSet, len(rss))
	for i, rs := range rss {
		result[i] = toReplicaSet(rs)
	}
	return result, nil
}

func SummarizeReplicaSets(rss []*appsv1.ReplicaSet) dto.ReplicaSetSummary {
	summary := dto.ReplicaSetSummary{}
	for _, rs := range rss {
		if rs.Status.ReadyReplicas >= rs.Status.Replicas {
			summary.Running++
		} else {
			summary.Pending++
		}
	}
	return summary
}
