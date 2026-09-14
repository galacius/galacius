package kube

import (
	"context"

	"github.com/galacius/galacius/packages/core/kube/dto"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/rest"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
)

// NewMetricsClient creates a metrics-server client from a rest.Config.
func NewMetricsClient(cfg *rest.Config) (*metricsclient.Clientset, error) {
	return metricsclient.NewForConfig(cfg)
}

// NewMetricsClientForContext builds a metrics client directly from the kubeconfig context.
// httpProxy / httpsProxy are forwarded to the transport (same proxy as the main clientset).
// kubeconfigPaths lists the kubeconfig files to load; pass nil to use the default rules.
func NewMetricsClientForContext(contextName, httpProxy, httpsProxy string, kubeconfigPaths []string) (*metricsclient.Clientset, error) {
	restConfig, err := RestConfigForContext(contextName, httpProxy, httpsProxy, kubeconfigPaths)
	if err != nil {
		return nil, err
	}
	return metricsclient.NewForConfig(restConfig)
}

// FetchPodMetrics queries metrics-server for per-pod CPU and memory usage.
// Returns an empty map (not an error) when metrics-server is not installed or the context is cancelled.
func FetchPodMetrics(ctx context.Context, mc metricsclient.Interface, namespace string) map[string]dto.PodUsage {
	list, err := mc.MetricsV1beta1().PodMetricses(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return map[string]dto.PodUsage{}
	}
	result := make(map[string]dto.PodUsage, len(list.Items))
	for _, item := range list.Items {
		var cpuMilli, memBytes int64
		for _, c := range item.Containers {
			cpuMilli += c.Usage.Cpu().MilliValue()
			memBytes += c.Usage.Memory().Value()
		}
		result[item.Namespace+"/"+item.Name] = dto.PodUsage{
			CPUMilliCores: cpuMilli,
			MemoryBytes:   memBytes,
		}
	}
	return result
}

// FetchNodeMetrics queries metrics-server for per-node CPU and memory usage.
// Returns an empty map (not an error) when metrics-server is not installed or the context is cancelled.
func FetchNodeMetrics(ctx context.Context, mc metricsclient.Interface) map[string]dto.NodeUsage {
	list, err := mc.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{})
	if err != nil {
		return map[string]dto.NodeUsage{}
	}
	result := make(map[string]dto.NodeUsage, len(list.Items))
	for _, item := range list.Items {
		result[item.Name] = dto.NodeUsage{
			CPUMilliCores: item.Usage.Cpu().MilliValue(),
			MemoryBytes:   item.Usage.Memory().Value(),
		}
	}
	return result
}
