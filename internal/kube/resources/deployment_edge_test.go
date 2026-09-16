package kubeResources

import (
	"errors"
	"testing"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestToDeployment_ConditionZeroTimestamp_FormatsAsValidRFC3339(t *testing.T) {
	d := makeDeployment("d1", "default")
	d.Status.Conditions = []appsv1.DeploymentCondition{
		{
			Type:               appsv1.DeploymentAvailable,
			Status:             corev1.ConditionTrue,
			LastTransitionTime: metav1.Time{},
			LastUpdateTime:     metav1.Time{},
		},
	}
	got := toDeployment(d)
	if len(got.Conditions) != 1 {
		t.Fatalf("expected 1 condition; got %d", len(got.Conditions))
	}
	if _, err := time.Parse(time.RFC3339, got.Conditions[0].LastTransitionTime); err != nil {
		t.Errorf("LastTransitionTime %q is not valid RFC3339: %v", got.Conditions[0].LastTransitionTime, err)
	}
	if _, err := time.Parse(time.RFC3339, got.Conditions[0].LastUpdateTime); err != nil {
		t.Errorf("LastUpdateTime %q is not valid RFC3339: %v", got.Conditions[0].LastUpdateTime, err)
	}
}

// — TolerationDetails edge cases —

func TestToDeployment_TolerationSecondsNil_StoresNil(t *testing.T) {
	d := makeDeployment("d1", "default")
	d.Spec.Template.Spec.Tolerations = []corev1.Toleration{
		{
			Key:               "key1",
			Operator:          corev1.TolerationOpEqual,
			Value:             "value1",
			Effect:            corev1.TaintEffectNoSchedule,
			TolerationSeconds: nil,
		},
	}
	got := toDeployment(d)
	if len(got.TolerationDetails) != 1 {
		t.Fatalf("expected 1 toleration; got %d", len(got.TolerationDetails))
	}
	if got.TolerationDetails[0].Seconds != nil {
		t.Errorf("TolerationSeconds = %v; want nil", got.TolerationDetails[0].Seconds)
	}
}

// — ListDeployments / GetDeploymentByName edge cases —

func TestListDeployments_EmptyLister_ReturnsNonNilEmptySlice(t *testing.T) {
	result, err := ListDeployments(newDeploymentLister(), nil)
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

func TestListDeployments_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListDeployments(&errorDeploymentLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestGetDeploymentByName_NameMismatch_ReturnsError(t *testing.T) {
	d := makeDeployment("dep-a", "default")
	lister := newDeploymentLister(d)
	_, err := GetDeploymentByName(lister, "default", "dep-b")
	if err == nil {
		t.Error("expected error for name mismatch; got nil")
	}
}
