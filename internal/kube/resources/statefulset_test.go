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

func newStatefulSetLister(sss ...*appsv1.StatefulSet) listersappsv1.StatefulSetLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, ss := range sss {
		_ = indexer.Add(ss)
	}
	return listersappsv1.NewStatefulSetLister(indexer)
}

func makeStatefulSet(name, namespace string) *appsv1.StatefulSet {
	return &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Status: appsv1.StatefulSetStatus{
			ReadyReplicas:     1,
			AvailableReplicas: 1,
		},
	}
}

func TestListStatefulSets_SingleNamespace(t *testing.T) {
	ss := makeStatefulSet("db", "default")
	lister := newStatefulSetLister(ss)

	result, err := ListStatefulSets(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "db" {
		t.Errorf("Name = %q; want %q", result[0].Name, "db")
	}
}

func TestListStatefulSets_EmptyNamespaceReturnsEmpty(t *testing.T) {
	ss1 := makeStatefulSet("ss-a", "ns-a")
	ss2 := makeStatefulSet("ss-b", "ns-b")
	lister := newStatefulSetLister(ss1, ss2)

	result, err := ListStatefulSets(lister, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 results (cluster-wide list) for nil namespaces, got %d", len(result))
	}
}

func TestListStatefulSets_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newStatefulSetLister()

	result, err := ListStatefulSets(lister, nil)
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

func TestToStatefulSet_NilReplicas_DefaultsToOne(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Spec.Replicas = nil

	got := toStatefulSet(ss)
	if got.Replicas != 1 {
		t.Errorf("Replicas = %d; want 1", got.Replicas)
	}
}

func TestToStatefulSet_WithReplicas(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	replicas := int32(3)
	ss.Spec.Replicas = &replicas

	got := toStatefulSet(ss)
	if got.Replicas != 3 {
		t.Errorf("Replicas = %d; want 3", got.Replicas)
	}
}

func TestToStatefulSet_PodStatus(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	replicas := int32(5)
	ss.Spec.Replicas = &replicas
	ss.Status.ReadyReplicas = 4
	ss.Status.AvailableReplicas = 3

	got := toStatefulSet(ss)
	if !contains(got.PodStatus, "5 desired") {
		t.Errorf("PodStatus = %q; should contain '5 desired'", got.PodStatus)
	}
	if !contains(got.PodStatus, "4 ready") {
		t.Errorf("PodStatus = %q; should contain '4 ready'", got.PodStatus)
	}
	if !contains(got.PodStatus, "3 available") {
		t.Errorf("PodStatus = %q; should contain '3 available'", got.PodStatus)
	}
}

func TestToStatefulSet_NilSelector_EmptySelector(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Spec.Selector = nil

	got := toStatefulSet(ss)
	if len(got.Selector) != 0 {
		t.Errorf("Selector = %v; want empty map", got.Selector)
	}
}

func TestToStatefulSet_WithSelector(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Spec.Selector = &metav1.LabelSelector{
		MatchLabels: map[string]string{"app": "mysql"},
	}

	got := toStatefulSet(ss)
	want := map[string]string{"app": "mysql"}
	if !reflect.DeepEqual(got.Selector, want) {
		t.Errorf("Selector = %v; want %v", got.Selector, want)
	}
}

func TestToStatefulSet_NilLabels_EmptyMap(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Labels = nil

	got := toStatefulSet(ss)
	if len(got.Labels) != 0 {
		t.Errorf("Labels length = %d; want 0", len(got.Labels))
	}
}

func TestToStatefulSet_WithAffinity(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Spec.Template.Spec.Affinity = &corev1.Affinity{}

	got := toStatefulSet(ss)
	if got.Affinities != 1 {
		t.Errorf("Affinities = %d; want 1", got.Affinities)
	}
}

func TestGetStatefulSetByName_Success(t *testing.T) {
	ss := makeStatefulSet("db", "default")
	lister := newStatefulSetLister(ss)

	result, err := GetStatefulSetByName(lister, "default", "db")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "db" {
		t.Errorf("Name = %q; want %q", result.Name, "db")
	}
}

func TestGetStatefulSetByName_NotFound(t *testing.T) {
	ss := makeStatefulSet("db", "default")
	lister := newStatefulSetLister(ss)

	_, err := GetStatefulSetByName(lister, "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent StatefulSet; got nil")
	}
}

func TestToStatefulSet_Health_ProgressingOnZeroObservedGeneration(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	// Status.ObservedGeneration left at its zero value.

	got := toStatefulSet(ss)
	if got.HealthStatus != "Progressing" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Progressing")
	}
	if got.HealthMessage != "Waiting for statefulset spec update to be observed..." {
		t.Errorf("HealthMessage = %q", got.HealthMessage)
	}
}

func TestToStatefulSet_Health_ProgressingOnStaleGeneration(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Generation = 2
	ss.Status.ObservedGeneration = 1

	got := toStatefulSet(ss)
	if got.HealthStatus != "Progressing" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Progressing")
	}
}

func TestToStatefulSet_Health_ProgressingOnUnreadyReplicas(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Generation = 1
	ss.Status.ObservedGeneration = 1
	replicas := int32(3)
	ss.Spec.Replicas = &replicas
	ss.Status.ReadyReplicas = 1

	got := toStatefulSet(ss)
	if got.HealthStatus != "Progressing" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Progressing")
	}
	want := "Waiting for 2 pods to be ready..."
	if got.HealthMessage != want {
		t.Errorf("HealthMessage = %q; want %q", got.HealthMessage, want)
	}
}

func TestToStatefulSet_Health_RollingUpdatePartitionProgressing(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Generation = 1
	ss.Status.ObservedGeneration = 1
	replicas := int32(5)
	ss.Spec.Replicas = &replicas
	ss.Status.ReadyReplicas = 5
	partition := int32(2)
	ss.Spec.UpdateStrategy = appsv1.StatefulSetUpdateStrategy{
		Type: appsv1.RollingUpdateStatefulSetStrategyType,
		RollingUpdate: &appsv1.RollingUpdateStatefulSetStrategy{
			Partition: &partition,
		},
	}
	ss.Status.UpdatedReplicas = 1 // target is 5-2=3, so still progressing

	got := toStatefulSet(ss)
	if got.HealthStatus != "Progressing" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Progressing")
	}
	want := "Waiting for partitioned roll out to finish: 1 out of 3 new pods have been updated..."
	if got.HealthMessage != want {
		t.Errorf("HealthMessage = %q; want %q", got.HealthMessage, want)
	}
}

func TestToStatefulSet_Health_RollingUpdatePartitionComplete(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Generation = 1
	ss.Status.ObservedGeneration = 1
	replicas := int32(5)
	ss.Spec.Replicas = &replicas
	ss.Status.ReadyReplicas = 5
	partition := int32(2)
	ss.Spec.UpdateStrategy = appsv1.StatefulSetUpdateStrategy{
		Type: appsv1.RollingUpdateStatefulSetStrategyType,
		RollingUpdate: &appsv1.RollingUpdateStatefulSetStrategy{
			Partition: &partition,
		},
	}
	ss.Status.UpdatedReplicas = 3 // target is 5-2=3, so met

	got := toStatefulSet(ss)
	if got.HealthStatus != "Healthy" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Healthy")
	}
}

func TestToStatefulSet_Health_OnDelete_Healthy(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Generation = 1
	ss.Status.ObservedGeneration = 1
	replicas := int32(1)
	ss.Spec.Replicas = &replicas
	ss.Status.ReadyReplicas = 1
	ss.Spec.UpdateStrategy = appsv1.StatefulSetUpdateStrategy{
		Type: appsv1.OnDeleteStatefulSetStrategyType,
	}

	got := toStatefulSet(ss)
	if got.HealthStatus != "Healthy" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Healthy")
	}
}

func TestToStatefulSet_Health_ProgressingOnRevisionMismatch(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Generation = 1
	ss.Status.ObservedGeneration = 1
	replicas := int32(1)
	ss.Spec.Replicas = &replicas
	ss.Status.ReadyReplicas = 1
	ss.Status.UpdateRevision = "rev-2"
	ss.Status.CurrentRevision = "rev-1"

	got := toStatefulSet(ss)
	if got.HealthStatus != "Progressing" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Progressing")
	}
}

func TestToStatefulSet_Health_HealthyWhenRevisionsMatch(t *testing.T) {
	ss := makeStatefulSet("ss", "default")
	ss.Generation = 1
	ss.Status.ObservedGeneration = 1
	replicas := int32(1)
	ss.Spec.Replicas = &replicas
	ss.Status.ReadyReplicas = 1
	ss.Status.UpdateRevision = "rev-1"
	ss.Status.CurrentRevision = "rev-1"

	got := toStatefulSet(ss)
	if got.HealthStatus != "Healthy" {
		t.Errorf("HealthStatus = %q; want %q", got.HealthStatus, "Healthy")
	}
}

func contains(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
