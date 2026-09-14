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

func toDaemonSet(ds *appsv1.DaemonSet) dto.DaemonSet {
	pods := fmt.Sprintf("%d/%d", ds.Status.NumberReady, ds.Status.DesiredNumberScheduled)

	nodeSelector := ds.Spec.Template.Spec.NodeSelector
	if nodeSelector == nil {
		nodeSelector = map[string]string{}
	}

	return dto.DaemonSet{
		Name:         ds.Name,
		Namespace:    ds.Namespace,
		Pods:         pods,
		NodeSelector: nodeSelector,
		Age:          humanAge(ds.CreationTimestamp.Time),
		CreatedAt:    ds.CreationTimestamp.Format(time.RFC3339),
		Labels: func() map[string]string {
			if ds.Labels == nil {
				return map[string]string{}
			}
			return ds.Labels
		}(),
		Annotations: func() map[string]string {
			if ds.Annotations == nil {
				return map[string]string{}
			}
			return ds.Annotations
		}(),
		ManagedFields: toManagedFields(ds),
		Selector: func() map[string]string {
			if ds.Spec.Selector == nil || ds.Spec.Selector.MatchLabels == nil {
				return map[string]string{}
			}
			return ds.Spec.Selector.MatchLabels
		}(),
		Images: func() []string {
			out := make([]string, 0, len(ds.Spec.Template.Spec.Containers))
			for _, c := range ds.Spec.Template.Spec.Containers {
				out = append(out, c.Image)
			}
			return out
		}(),
		StrategyType: string(ds.Spec.UpdateStrategy.Type),
		Tolerations:  len(ds.Spec.Template.Spec.Tolerations),
		PodStatus: fmt.Sprintf("%d desired, %d ready, %d available, %d unavailable",
			ds.Status.DesiredNumberScheduled, ds.Status.NumberReady,
			ds.Status.NumberAvailable, ds.Status.NumberUnavailable),
	}
}

func GetDaemonSetByName(lister listersappsv1.DaemonSetLister, namespace, name string) (dto.DaemonSet, error) {
	ds, err := lister.DaemonSets(namespace).Get(name)
	if err != nil {
		return dto.DaemonSet{}, err
	}
	return toDaemonSet(ds), nil
}

func ListDaemonSets(lister listersappsv1.DaemonSetLister, namespaces []string) ([]dto.DaemonSet, error) {
	var dss []*appsv1.DaemonSet
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		dss = all
	} else {
		for _, ns := range namespaces {
			nsDaemonSets, err := lister.DaemonSets(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListDaemonSets: namespace %q: %v", ns, err)
				continue
			}
			dss = append(dss, nsDaemonSets...)
		}
	}
	result := make([]dto.DaemonSet, len(dss))
	for i, ds := range dss {
		result[i] = toDaemonSet(ds)
	}
	return result, nil
}

func SummarizeDaemonSets(dss []*appsv1.DaemonSet) dto.DaemonSetSummary {
	summary := dto.DaemonSetSummary{}
	for _, ds := range dss {
		desired := ds.Status.DesiredNumberScheduled
		ready := ds.Status.NumberReady
		if desired > 0 && ready >= desired {
			summary.Running++
		} else {
			summary.Pending++
		}
	}
	return summary
}
