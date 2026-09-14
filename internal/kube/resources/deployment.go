package kubeResources

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersappsv1 "k8s.io/client-go/listers/apps/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func toDeployment(d *appsv1.Deployment) dto.Deployment {
	var replicas int32 = 1
	if d.Spec.Replicas != nil {
		replicas = *d.Spec.Replicas
	}

	return dto.Deployment{
		Name:      d.Name,
		Namespace: d.Namespace,
		Pods:      fmt.Sprintf("%d/%d", d.Status.ReadyReplicas, d.Status.Replicas),
		Replicas:  replicas,
		Age:       humanAge(d.CreationTimestamp.Time),
		CreatedAt: d.CreationTimestamp.Time.Format(time.RFC3339),
		Labels: func() map[string]string {
			if d.Labels == nil {
				return map[string]string{}
			}
			return d.Labels
		}(),
		Annotations: func() map[string]string {
			if d.Annotations == nil {
				return map[string]string{}
			}
			return d.Annotations
		}(),
		ManagedFields: toManagedFields(d),
		ReplicasDetail: func() string {
			var desired int32 = 1
			if d.Spec.Replicas != nil {
				desired = *d.Spec.Replicas
			}
			return fmt.Sprintf("%d desired, %d updated, %d total, %d available, %d unavailable",
				desired, d.Status.UpdatedReplicas, d.Status.Replicas,
				d.Status.AvailableReplicas, d.Status.UnavailableReplicas)
		}(),
		Selector: func() map[string]string {
			if d.Spec.Selector == nil || d.Spec.Selector.MatchLabels == nil {
				return map[string]string{}
			}
			return d.Spec.Selector.MatchLabels
		}(),
		NodeSelector: func() map[string]string {
			if d.Spec.Template.Spec.NodeSelector == nil {
				return map[string]string{}
			}
			return d.Spec.Template.Spec.NodeSelector
		}(),
		StrategyType: string(d.Spec.Strategy.Type),
		MaxSurge: func() string {
			ru := d.Spec.Strategy.RollingUpdate
			if ru == nil || ru.MaxSurge == nil {
				return ""
			}
			return ru.MaxSurge.String()
		}(),
		MaxUnavailable: func() string {
			ru := d.Spec.Strategy.RollingUpdate
			if ru == nil || ru.MaxUnavailable == nil {
				return ""
			}
			return ru.MaxUnavailable.String()
		}(),
		Conditions: func() []dto.DeploymentCondition {
			out := make([]dto.DeploymentCondition, 0, len(d.Status.Conditions))
			for _, c := range d.Status.Conditions {
				out = append(out, dto.DeploymentCondition{
					Type:               string(c.Type),
					Status:             string(c.Status),
					Message:            c.Message,
					Reason:             c.Reason,
					LastTransitionTime: c.LastTransitionTime.Time.Format(time.RFC3339),
					LastUpdateTime:     c.LastUpdateTime.Time.Format(time.RFC3339),
				})
			}
			return out
		}(),
		Tolerations: len(d.Spec.Template.Spec.Tolerations),
		TolerationDetails: func() []dto.TolerationDetail {
			out := make([]dto.TolerationDetail, 0, len(d.Spec.Template.Spec.Tolerations))
			for _, t := range d.Spec.Template.Spec.Tolerations {
				out = append(out, dto.TolerationDetail{
					Key:      t.Key,
					Operator: string(t.Operator),
					Value:    t.Value,
					Effect:   string(t.Effect),
					Seconds:  t.TolerationSeconds,
				})
			}
			return out
		}(),
		AffinityCount: func() int {
			if d.Spec.Template.Spec.Affinity == nil {
				return 0
			}
			n := 0
			if d.Spec.Template.Spec.Affinity.NodeAffinity != nil {
				n++
			}
			if d.Spec.Template.Spec.Affinity.PodAffinity != nil {
				n++
			}
			if d.Spec.Template.Spec.Affinity.PodAntiAffinity != nil {
				n++
			}
			return n
		}(),
		Affinities: func() string {
			if d.Spec.Template.Spec.Affinity == nil {
				return ""
			}
			b, err := sigsyaml.Marshal(d.Spec.Template.Spec.Affinity)
			if err != nil {
				return ""
			}
			return strings.TrimSpace(string(b))
		}(),
	}
}

func GetDeploymentByName(lister listersappsv1.DeploymentLister, namespace, name string) (dto.Deployment, error) {
	dep, err := lister.Deployments(namespace).Get(name)
	if err != nil {
		return dto.Deployment{}, err
	}
	return toDeployment(dep), nil
}

func ListDeployments(lister listersappsv1.DeploymentLister, namespaces []string) ([]dto.Deployment, error) {
	var deps []*appsv1.Deployment
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		deps = all
	} else {
		for _, ns := range namespaces {
			nsDeployments, err := lister.Deployments(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListDeployments: namespace %q: %v", ns, err)
				continue
			}
			deps = append(deps, nsDeployments...)
		}
	}
	result := make([]dto.Deployment, len(deps))
	for i, d := range deps {
		result[i] = toDeployment(d)
	}
	return result, nil
}

func SummarizeDeployments(deps []*appsv1.Deployment) dto.DeploymentSummary {
	summary := dto.DeploymentSummary{}
	for _, d := range deps {
		desired := d.Status.Replicas
		ready := d.Status.ReadyReplicas
		if desired > 0 && ready >= desired {
			summary.Running++
		} else {
			summary.Pending++
		}
	}
	return summary
}
