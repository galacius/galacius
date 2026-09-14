package kubeResources

import (
	"reflect"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	listersappsv1 "k8s.io/client-go/listers/apps/v1"
	"k8s.io/client-go/tools/cache"
)

func newReplicaSetLister(rss ...*appsv1.ReplicaSet) listersappsv1.ReplicaSetLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, rs := range rss {
		_ = indexer.Add(rs)
	}
	return listersappsv1.NewReplicaSetLister(indexer)
}

func makeReplicaSet(name, namespace string) *appsv1.ReplicaSet {
	return &appsv1.ReplicaSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Status: appsv1.ReplicaSetStatus{
			Replicas:      1,
			ReadyReplicas: 1,
		},
	}
}

func TestListReplicaSets_SingleNamespace(t *testing.T) {
	rs := makeReplicaSet("rs-1", "default")
	lister := newReplicaSetLister(rs)

	result, err := ListReplicaSets(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "rs-1" {
		t.Errorf("Name = %q; want %q", result[0].Name, "rs-1")
	}
}

func TestListReplicaSets_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	rs1 := makeReplicaSet("rs-a", "ns-a")
	rs2 := makeReplicaSet("rs-b", "ns-b")
	lister := newReplicaSetLister(rs1, rs2)

	result, err := ListReplicaSets(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListReplicaSets_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newReplicaSetLister()

	result, err := ListReplicaSets(lister, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Error("expected non-nil slice; got nil")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result; got %d items", len(result))
	}
}

func TestToReplicaSet_NilReplicas_DefaultsToOne(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	rs.Spec.Replicas = nil

	got := toReplicaSet(rs)
	if got.Desired != 0 {
		t.Errorf("Desired = %d; want 0 (nil handled as zero)", got.Desired)
	}
}

func TestToReplicaSet_WithReplicas(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	replicas := int32(3)
	rs.Spec.Replicas = &replicas

	got := toReplicaSet(rs)
	if got.Desired != 3 {
		t.Errorf("Desired = %d; want 3", got.Desired)
	}
}

func TestToReplicaSet_NilSelector_EmptySelector(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	rs.Spec.Selector = nil

	got := toReplicaSet(rs)
	if len(got.Selector) != 0 {
		t.Errorf("Selector = %v; want empty map", got.Selector)
	}
}

func TestToReplicaSet_WithSelector(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	rs.Spec.Selector = &metav1.LabelSelector{
		MatchLabels: map[string]string{"app": "test"},
	}

	got := toReplicaSet(rs)
	want := map[string]string{"app": "test"}
	if !reflect.DeepEqual(got.Selector, want) {
		t.Errorf("Selector = %v; want %v", got.Selector, want)
	}
}

func TestToReplicaSet_WithOwnerReferences(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	rs.OwnerReferences = []metav1.OwnerReference{
		{Name: "dep-1", Kind: "Deployment"},
	}

	got := toReplicaSet(rs)
	if got.OwnerName != "dep-1" {
		t.Errorf("OwnerName = %q; want %q", got.OwnerName, "dep-1")
	}
	if got.OwnerKind != "Deployment" {
		t.Errorf("OwnerKind = %q; want %q", got.OwnerKind, "Deployment")
	}
}

func TestToReplicaSet_NilLabels_EmptyMap(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	rs.Labels = nil

	got := toReplicaSet(rs)
	if len(got.Labels) != 0 {
		t.Errorf("Labels length = %d; want 0", len(got.Labels))
	}
}

func TestGetReplicaSetByName_Success(t *testing.T) {
	rs := makeReplicaSet("rs-1", "default")
	lister := newReplicaSetLister(rs)

	result, err := GetReplicaSetByName(lister, "default", "rs-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "rs-1" {
		t.Errorf("Name = %q; want %q", result.Name, "rs-1")
	}
}

func TestGetReplicaSetByName_NotFound(t *testing.T) {
	rs := makeReplicaSet("rs-1", "default")
	lister := newReplicaSetLister(rs)

	_, err := GetReplicaSetByName(lister, "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent ReplicaSet; got nil")
	}
}

func TestToReplicaSet_MultipleContainers(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	rs.Spec.Template.Spec.Containers = []corev1.Container{
		{Image: "image-1"},
		{Image: "image-2"},
	}

	got := toReplicaSet(rs)
	if len(got.Images) != 2 {
		t.Errorf("Images length = %d; want 2", len(got.Images))
	}
	if got.Images[0] != "image-1" {
		t.Errorf("Images[0] = %q; want %q", got.Images[0], "image-1")
	}
}

func TestToReplicaSet_WithTolerations(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	rs.Spec.Template.Spec.Tolerations = []corev1.Toleration{
		{Key: "key1"},
		{Key: "key2"},
	}

	got := toReplicaSet(rs)
	if got.Tolerations != 2 {
		t.Errorf("Tolerations = %d; want 2", got.Tolerations)
	}
}

func TestToReplicaSet_WithAffinity(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	rs.Spec.Template.Spec.Affinity = &corev1.Affinity{}

	got := toReplicaSet(rs)
	if got.Affinities != 1 {
		t.Errorf("Affinities = %d; want 1", got.Affinities)
	}
}

func TestToReplicaSet_Health_Healthy(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	replicas := int32(1)
	rs.Spec.Replicas = &replicas
	rs.Generation = 1
	rs.Status.ObservedGeneration = 1
	rs.Status.ReadyReplicas = 1
	rs.Status.AvailableReplicas = 1

	got := toReplicaSet(rs)
	if got.HealthStatus != "Healthy" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Healthy")
	}
	if got.HealthMessage != "" {
		t.Errorf("HealthMessage = %q; want empty", got.HealthMessage)
	}
}

func TestToReplicaSet_Health_ReadyButNotYetAvailable_StillProgressing(t *testing.T) {
	// Regresses a bug where the health check used ReadyReplicas instead of
	// AvailableReplicas: a pod can be Ready before minReadySeconds elapses,
	// during which it is Ready but not yet Available.
	rs := makeReplicaSet("rs", "default")
	replicas := int32(1)
	rs.Spec.Replicas = &replicas
	rs.Generation = 1
	rs.Status.ObservedGeneration = 1
	rs.Status.ReadyReplicas = 1
	rs.Status.AvailableReplicas = 0

	got := toReplicaSet(rs)
	if got.HealthStatus != "Progressing" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Progressing")
	}
}

func TestToReplicaSet_Health_ProgressingOnStaleGeneration(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	rs.Generation = 2
	rs.Status.ObservedGeneration = 1

	got := toReplicaSet(rs)
	if got.HealthStatus != "Progressing" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Progressing")
	}
}

func TestToReplicaSet_Health_ProgressingOnUnavailableReplicas(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	replicas := int32(3)
	rs.Spec.Replicas = &replicas
	rs.Generation = 1
	rs.Status.ObservedGeneration = 1
	rs.Status.ReadyReplicas = 1
	rs.Status.AvailableReplicas = 1

	got := toReplicaSet(rs)
	if got.HealthStatus != "Progressing" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Progressing")
	}
	want := "Waiting for rollout to finish: 1 out of 3 new replicas are available..."
	if got.HealthMessage != want {
		t.Errorf("HealthMessage = %q; want %q", got.HealthMessage, want)
	}
}

func TestToReplicaSet_Health_DegradedOnReplicaFailure(t *testing.T) {
	rs := makeReplicaSet("rs", "default")
	replicas := int32(1)
	rs.Spec.Replicas = &replicas
	rs.Generation = 1
	rs.Status.ObservedGeneration = 1
	rs.Status.ReadyReplicas = 1
	rs.Status.AvailableReplicas = 1
	rs.Status.Conditions = []appsv1.ReplicaSetCondition{
		{Type: appsv1.ReplicaSetReplicaFailure, Status: corev1.ConditionTrue, Message: "quota exceeded"},
	}

	got := toReplicaSet(rs)
	if got.HealthStatus != "Degraded" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Degraded")
	}
	if got.HealthMessage != "quota exceeded" {
		t.Errorf("HealthMessage = %q; want %q", got.HealthMessage, "quota exceeded")
	}
}

func TestToReplicaSet_Health_DegradedTakesPriorityOverProgressing(t *testing.T) {
	// Regresses a bug where the Progressing (unavailable-replicas) check ran
	// before the ReplicaFailure condition check, so a genuinely degraded
	// ReplicaSet (e.g. blocked by quota, which also keeps replicas below
	// desired) incorrectly reported "Progressing" instead of "Degraded".
	rs := makeReplicaSet("rs", "default")
	replicas := int32(3)
	rs.Spec.Replicas = &replicas
	rs.Generation = 1
	rs.Status.ObservedGeneration = 1
	rs.Status.ReadyReplicas = 0
	rs.Status.AvailableReplicas = 0
	rs.Status.Conditions = []appsv1.ReplicaSetCondition{
		{Type: appsv1.ReplicaSetReplicaFailure, Status: corev1.ConditionTrue, Message: "quota exceeded"},
	}

	got := toReplicaSet(rs)
	if got.HealthStatus != "Degraded" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Degraded")
	}
	if got.HealthMessage != "quota exceeded" {
		t.Errorf("HealthMessage = %q; want %q", got.HealthMessage, "quota exceeded")
	}
}
