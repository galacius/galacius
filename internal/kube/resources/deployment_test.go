package kubeResources

import (
	"reflect"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersappsv1 "k8s.io/client-go/listers/apps/v1"
	"k8s.io/client-go/tools/cache"
)

type errorDeploymentLister struct{ err error }

func (e *errorDeploymentLister) List(_ labels.Selector) ([]*appsv1.Deployment, error) {
	return nil, e.err
}
func (e *errorDeploymentLister) Deployments(_ string) listersappsv1.DeploymentNamespaceLister {
	return &errorDeploymentNamespaceLister{e.err}
}

type errorDeploymentNamespaceLister struct{ err error }

func (e *errorDeploymentNamespaceLister) List(_ labels.Selector) ([]*appsv1.Deployment, error) {
	return nil, e.err
}
func (e *errorDeploymentNamespaceLister) Get(_ string) (*appsv1.Deployment, error) {
	return nil, e.err
}

func newDeploymentLister(deps ...*appsv1.Deployment) listersappsv1.DeploymentLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, d := range deps {
		_ = indexer.Add(d)
	}
	return listersappsv1.NewDeploymentLister(indexer)
}

func makeDeployment(name, namespace string) *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Spec:   appsv1.DeploymentSpec{},
		Status: appsv1.DeploymentStatus{},
	}
}

func TestToDeployment_NodeSelectorNil_ReturnsEmptyMap(t *testing.T) {
	d := makeDeployment("d1", "default")
	d.Spec.Template.Spec.NodeSelector = nil
	got := toDeployment(d)
	if len(got.NodeSelector) != 0 {
		t.Errorf("NodeSelector = %v; want empty map", got.NodeSelector)
	}
}

func TestToDeployment_NodeSelectorEmpty_ReturnsEmptyMap(t *testing.T) {
	d := makeDeployment("d1", "default")
	d.Spec.Template.Spec.NodeSelector = map[string]string{}
	got := toDeployment(d)
	if len(got.NodeSelector) != 0 {
		t.Errorf("NodeSelector = %v; want empty map", got.NodeSelector)
	}
}

func TestToDeployment_NodeSelectorMultiEntry_ReturnsAllEntries(t *testing.T) {
	d := makeDeployment("d1", "default")
	d.Spec.Template.Spec.NodeSelector = map[string]string{
		"zone":   "us-west",
		"disk":   "ssd",
		"memory": "high",
	}
	got := toDeployment(d)
	want := map[string]string{"zone": "us-west", "disk": "ssd", "memory": "high"}
	if !reflect.DeepEqual(got.NodeSelector, want) {
		t.Errorf("NodeSelector = %v; want %v", got.NodeSelector, want)
	}
}

func TestToDeployment_ConditionsEmpty_ReturnsEmptySlice(t *testing.T) {
	d := makeDeployment("d1", "default")
	d.Status.Conditions = []appsv1.DeploymentCondition{}
	got := toDeployment(d)
	if got.Conditions == nil {
		t.Error("Conditions must not be nil for empty input slice")
	}
	if len(got.Conditions) != 0 {
		t.Errorf("Conditions length = %d; want 0", len(got.Conditions))
	}
}

func TestToDeployment_TolerationsEmpty_ReturnsZeroAndEmptySlice(t *testing.T) {
	d := makeDeployment("d1", "default")
	d.Spec.Template.Spec.Tolerations = []corev1.Toleration{}
	got := toDeployment(d)
	if got.Tolerations != 0 {
		t.Errorf("Tolerations count = %d; want 0", got.Tolerations)
	}
	if got.TolerationDetails == nil {
		t.Error("TolerationDetails must not be nil")
	}
	if len(got.TolerationDetails) != 0 {
		t.Errorf("TolerationDetails length = %d; want 0", len(got.TolerationDetails))
	}
}

func TestToDeployment_AffinityNil_CountZeroAndEmptyString(t *testing.T) {
	d := makeDeployment("d1", "default")
	d.Spec.Template.Spec.Affinity = nil
	got := toDeployment(d)
	if got.AffinityCount != 0 {
		t.Errorf("AffinityCount = %d; want 0", got.AffinityCount)
	}
	if got.Affinities != "" {
		t.Errorf("Affinities = %q; want empty string", got.Affinities)
	}
}

// — SummarizeDeployments tests —

// TestSummarizeDeployments_EmptyList verifies zero summary for empty deployment list.
func TestSummarizeDeployments_EmptyList(t *testing.T) {
	summary := SummarizeDeployments([]*appsv1.Deployment{})
	if summary.Running != 0 || summary.Pending != 0 {
		t.Errorf("empty list returned non-zero summary: %+v", summary)
	}
}

// TestSummarizeDeployments_AllRunning verifies deployments with ready >= desired count as running.
func TestSummarizeDeployments_AllRunning(t *testing.T) {
	replicas := int32(3)
	deps := []*appsv1.Deployment{
		{
			Spec:   appsv1.DeploymentSpec{Replicas: &replicas},
			Status: appsv1.DeploymentStatus{Replicas: 3, ReadyReplicas: 3},
		},
		{
			Spec:   appsv1.DeploymentSpec{Replicas: &replicas},
			Status: appsv1.DeploymentStatus{Replicas: 3, ReadyReplicas: 3},
		},
	}
	summary := SummarizeDeployments(deps)
	if summary.Running != 2 {
		t.Errorf("Running = %d; want 2", summary.Running)
	}
	if summary.Pending != 0 {
		t.Errorf("Pending = %d; want 0", summary.Pending)
	}
}

// TestSummarizeDeployments_PartiallyReady verifies deployments with ready < desired count as pending.
func TestSummarizeDeployments_PartiallyReady(t *testing.T) {
	replicas := int32(3)
	deps := []*appsv1.Deployment{
		{
			Spec:   appsv1.DeploymentSpec{Replicas: &replicas},
			Status: appsv1.DeploymentStatus{Replicas: 3, ReadyReplicas: 2},
		},
	}
	summary := SummarizeDeployments(deps)
	if summary.Running != 0 {
		t.Errorf("Running = %d; want 0", summary.Running)
	}
	if summary.Pending != 1 {
		t.Errorf("Pending = %d; want 1", summary.Pending)
	}
}

// TestSummarizeDeployments_DesiredZero_CountsAsPending verifies scaled-to-zero deployments
// are counted as pending (and included in the total), matching pre-refactor behavior.
func TestSummarizeDeployments_DesiredZero_CountsAsPending(t *testing.T) {
	zero := int32(0)
	deps := []*appsv1.Deployment{
		{
			Spec:   appsv1.DeploymentSpec{Replicas: &zero},
			Status: appsv1.DeploymentStatus{Replicas: 0, ReadyReplicas: 0},
		},
	}
	summary := SummarizeDeployments(deps)
	if summary.Running != 0 {
		t.Errorf("Running = %d; want 0", summary.Running)
	}
	if summary.Pending != 1 {
		t.Errorf("Pending = %d; want 1 (desired=0 deployment counts as pending)", summary.Pending)
	}
}

// TestSummarizeDeployments_NoReplicas_MixedReadiness verifies a deployment with missing spec.Replicas defaults to 1.
func TestSummarizeDeployments_NoReplicas_DefaultsTo1(t *testing.T) {
	deps := []*appsv1.Deployment{
		{
			Spec:   appsv1.DeploymentSpec{Replicas: nil},
			Status: appsv1.DeploymentStatus{Replicas: 1, ReadyReplicas: 1},
		},
	}
	summary := SummarizeDeployments(deps)
	if summary.Running != 1 {
		t.Errorf("Running = %d; want 1 (nil Replicas defaults to 1)", summary.Running)
	}
	if summary.Pending != 0 {
		t.Errorf("Pending = %d; want 0", summary.Pending)
	}
}

// TestSummarizeDeployments_Mixed verifies a mix of running and pending deployments.
func TestSummarizeDeployments_Mixed(t *testing.T) {
	replicas := int32(2)
	deps := []*appsv1.Deployment{
		{
			Spec:   appsv1.DeploymentSpec{Replicas: &replicas},
			Status: appsv1.DeploymentStatus{Replicas: 2, ReadyReplicas: 2},
		},
		{
			Spec:   appsv1.DeploymentSpec{Replicas: &replicas},
			Status: appsv1.DeploymentStatus{Replicas: 2, ReadyReplicas: 1},
		},
		{
			Spec:   appsv1.DeploymentSpec{Replicas: &replicas},
			Status: appsv1.DeploymentStatus{Replicas: 2, ReadyReplicas: 0},
		},
	}
	summary := SummarizeDeployments(deps)
	if summary.Running != 1 {
		t.Errorf("Running = %d; want 1", summary.Running)
	}
	if summary.Pending != 2 {
		t.Errorf("Pending = %d; want 2", summary.Pending)
	}
}
