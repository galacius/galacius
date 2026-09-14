package kubeResources

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersautoscalingv2 "k8s.io/client-go/listers/autoscaling/v2"
)

func toHPADetail(hpa *autoscalingv2.HorizontalPodAutoscaler) dto.HPADetail {
	var minPods int32 = 1
	if hpa.Spec.MinReplicas != nil {
		minPods = *hpa.Spec.MinReplicas
	}

	// Derive status from conditions.
	status := "Unknown"
	for _, c := range hpa.Status.Conditions {
		if c.Type == autoscalingv2.ScalingActive {
			if c.Status == corev1.ConditionTrue {
				status = "Active"
			} else {
				status = "Inactive"
			}
			break
		}
	}

	// Build metrics list with current and target values.
	metrics := make([]dto.HPAMetric, 0, len(hpa.Spec.Metrics))
	for _, m := range hpa.Spec.Metrics {
		metric := dto.HPAMetric{}

		switch m.Type {
		case autoscalingv2.ResourceMetricSourceType:
			if m.Resource != nil {
				metric.Name = fmt.Sprintf("Resource %s on Pods", m.Resource.Name)
				// Try to find current value from status
				metric.Current = "unknown"
				for _, sm := range hpa.Status.CurrentMetrics {
					if sm.Type == autoscalingv2.ResourceMetricSourceType && sm.Resource != nil &&
						sm.Resource.Name == m.Resource.Name {
						if sm.Resource.Current.AverageUtilization != nil {
							metric.Current = fmt.Sprintf("%d%%", *sm.Resource.Current.AverageUtilization)
						}
						break
					}
				}
				// Target value
				if m.Resource.Target.AverageUtilization != nil {
					metric.Target = fmt.Sprintf("%d%%", *m.Resource.Target.AverageUtilization)
				} else {
					metric.Target = "unknown"
				}
			}
		case autoscalingv2.PodsMetricSourceType:
			if m.Pods != nil {
				metric.Name = m.Pods.Metric.Name
				metric.Current = "unknown"
				metric.Target = "unknown"
				// Try to find current value
				for _, sm := range hpa.Status.CurrentMetrics {
					if sm.Type == autoscalingv2.PodsMetricSourceType && sm.Pods != nil {
						if sm.Pods.Current.AverageValue != nil {
							metric.Current = sm.Pods.Current.AverageValue.String()
						}
						break
					}
				}
				// Target
				if m.Pods.Target.AverageValue != nil {
					metric.Target = m.Pods.Target.AverageValue.String()
				}
			}
		case autoscalingv2.ObjectMetricSourceType:
			if m.Object != nil {
				metric.Name = m.Object.Metric.Name
				metric.Current = "unknown"
				metric.Target = "unknown"
				// Try to find current value
				for _, sm := range hpa.Status.CurrentMetrics {
					if sm.Type == autoscalingv2.ObjectMetricSourceType && sm.Object != nil {
						if sm.Object.Current.Value != nil {
							metric.Current = sm.Object.Current.Value.String()
						}
						break
					}
				}
				// Target
				if m.Object.Target.Value != nil {
					metric.Target = m.Object.Target.Value.String()
				}
			}
		case autoscalingv2.ExternalMetricSourceType:
			if m.External != nil {
				metric.Name = m.External.Metric.Name
				metric.Current = "unknown"
				metric.Target = "unknown"
				// Try to find current value
				for _, sm := range hpa.Status.CurrentMetrics {
					if sm.Type == autoscalingv2.ExternalMetricSourceType && sm.External != nil {
						if sm.External.Current.AverageValue != nil {
							metric.Current = sm.External.Current.AverageValue.String()
						}
						break
					}
				}
				// Target
				if m.External.Target.AverageValue != nil {
					metric.Target = m.External.Target.AverageValue.String()
				}
			}
		}

		if metric.Name != "" {
			metrics = append(metrics, metric)
		}
	}

	labels := hpa.Labels
	if labels == nil {
		labels = map[string]string{}
	}
	annotations := hpa.Annotations
	if annotations == nil {
		annotations = map[string]string{}
	}

	return dto.HPADetail{
		Name:        hpa.Name,
		Namespace:   hpa.Namespace,
		CreatedAt:   hpa.CreationTimestamp.UTC().Format(time.RFC3339),
		Labels:      labels,
		Annotations: annotations,
		ScaleTargetRef: dto.ScaleTargetRef{
			Kind: hpa.Spec.ScaleTargetRef.Kind,
			Name: hpa.Spec.ScaleTargetRef.Name,
		},
		Metrics:  metrics,
		MinPods:  minPods,
		MaxPods:  hpa.Spec.MaxReplicas,
		Replicas: hpa.Status.CurrentReplicas,
		Status:   status,
		Age:      humanAge(hpa.CreationTimestamp.Time),
	}
}

func toHPA(hpa *autoscalingv2.HorizontalPodAutoscaler) dto.HPA {
	var minPods int32 = 1
	if hpa.Spec.MinReplicas != nil {
		minPods = *hpa.Spec.MinReplicas
	}

	// Build a short metrics summary from spec.
	var parts []string
	for _, m := range hpa.Spec.Metrics {
		switch m.Type {
		case autoscalingv2.ResourceMetricSourceType:
			if m.Resource != nil && m.Resource.Target.AverageUtilization != nil {
				parts = append(parts, fmt.Sprintf("%s/%d%%", m.Resource.Name, *m.Resource.Target.AverageUtilization))
			} else if m.Resource != nil {
				parts = append(parts, string(m.Resource.Name))
			}
		case autoscalingv2.PodsMetricSourceType:
			if m.Pods != nil {
				parts = append(parts, m.Pods.Metric.Name)
			}
		case autoscalingv2.ObjectMetricSourceType:
			if m.Object != nil {
				parts = append(parts, m.Object.Metric.Name)
			}
		case autoscalingv2.ExternalMetricSourceType:
			if m.External != nil {
				parts = append(parts, m.External.Metric.Name)
			}
		}
	}
	metrics := strings.Join(parts, ", ")
	if metrics == "" {
		metrics = "<none>"
	}

	// Derive status from conditions.
	status := "Unknown"
	for _, c := range hpa.Status.Conditions {
		if c.Type == autoscalingv2.ScalingActive {
			if c.Status == corev1.ConditionTrue {
				status = "Active"
			} else {
				status = "Inactive"
			}
			break
		}
	}

	return dto.HPA{
		Name:      hpa.Name,
		Namespace: hpa.Namespace,
		Metrics:   metrics,
		MinPods:   minPods,
		MaxPods:   hpa.Spec.MaxReplicas,
		Replicas:  hpa.Status.CurrentReplicas,
		Age:       humanAge(hpa.CreationTimestamp.Time),
		Status:    status,
	}
}

func ListHPAs(lister listersautoscalingv2.HorizontalPodAutoscalerLister, namespaces []string) ([]dto.HPA, error) {
	var hpas []*autoscalingv2.HorizontalPodAutoscaler
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		hpas = all
	} else {
		for _, ns := range namespaces {
			nsHpas, err := lister.HorizontalPodAutoscalers(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListHPAs: namespace %q: %v", ns, err)
				continue
			}
			hpas = append(hpas, nsHpas...)
		}
	}
	result := make([]dto.HPA, len(hpas))
	for i, hpa := range hpas {
		result[i] = toHPA(hpa)
	}
	return result, nil
}

func GetHPAByName(lister listersautoscalingv2.HorizontalPodAutoscalerLister, namespace, name string) (dto.HPADetail, error) {
	hpa, err := lister.HorizontalPodAutoscalers(namespace).Get(name)
	if err != nil {
		return dto.HPADetail{}, err
	}
	return toHPADetail(hpa), nil
}
