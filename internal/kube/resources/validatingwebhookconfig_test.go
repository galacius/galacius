package kubeResources

import (
	"errors"
	"testing"

	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersadmissionregistrationv1 "k8s.io/client-go/listers/admissionregistration/v1"
	"k8s.io/client-go/tools/cache"
)

type errorValidatingWebhookConfigLister struct{ err error }

func (e *errorValidatingWebhookConfigLister) List(_ labels.Selector) ([]*admissionregistrationv1.ValidatingWebhookConfiguration, error) {
	return nil, e.err
}
func (e *errorValidatingWebhookConfigLister) Get(_ string) (*admissionregistrationv1.ValidatingWebhookConfiguration, error) {
	return nil, e.err
}

func newValidatingWebhookConfigLister(vwcs ...*admissionregistrationv1.ValidatingWebhookConfiguration) listersadmissionregistrationv1.ValidatingWebhookConfigurationLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{})
	for _, vwc := range vwcs {
		_ = indexer.Add(vwc)
	}
	return listersadmissionregistrationv1.NewValidatingWebhookConfigurationLister(indexer)
}

func makeValidatingWebhookConfig(name string) *admissionregistrationv1.ValidatingWebhookConfiguration {
	return &admissionregistrationv1.ValidatingWebhookConfiguration{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
	}
}

func TestListValidatingWebhookConfigs_Single(t *testing.T) {
	vwc := makeValidatingWebhookConfig("pod-policy")
	lister := newValidatingWebhookConfigLister(vwc)

	result, err := ListValidatingWebhookConfigs(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "pod-policy" {
		t.Errorf("Name = %q; want %q", result[0].Name, "pod-policy")
	}
}

func TestListValidatingWebhookConfigs_Multiple(t *testing.T) {
	vwc1 := makeValidatingWebhookConfig("pod-policy")
	vwc2 := makeValidatingWebhookConfig("service-policy")
	lister := newValidatingWebhookConfigLister(vwc1, vwc2)

	result, err := ListValidatingWebhookConfigs(lister)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 results, got %d", len(result))
	}
}

func TestListValidatingWebhookConfigs_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newValidatingWebhookConfigLister()

	result, err := ListValidatingWebhookConfigs(lister)
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

func TestListValidatingWebhookConfigs_ErrorPropagation(t *testing.T) {
	sentinel := errors.New("store unavailable")
	_, err := ListValidatingWebhookConfigs(&errorValidatingWebhookConfigLister{err: sentinel})
	if !errors.Is(err, sentinel) {
		t.Errorf("expected sentinel error; got %v", err)
	}
}

func TestToValidatingWebhookConfig_NoWebhooks(t *testing.T) {
	vwc := makeValidatingWebhookConfig("config")
	vwc.Webhooks = []admissionregistrationv1.ValidatingWebhook{}

	got := toValidatingWebhookConfig(vwc)
	if got.Webhooks != 0 {
		t.Errorf("Webhooks = %d; want 0", got.Webhooks)
	}
}

func TestToValidatingWebhookConfig_MultipleWebhooks(t *testing.T) {
	vwc := makeValidatingWebhookConfig("config")
	vwc.Webhooks = []admissionregistrationv1.ValidatingWebhook{
		{Name: "webhook1"},
		{Name: "webhook2"},
		{Name: "webhook3"},
	}

	got := toValidatingWebhookConfig(vwc)
	if got.Webhooks != 3 {
		t.Errorf("Webhooks = %d; want 3", got.Webhooks)
	}
}

func TestGetValidatingWebhookConfigByName_Success(t *testing.T) {
	vwc := makeValidatingWebhookConfig("pod-policy")
	vwc.Labels = map[string]string{"app": "policy"}
	vwc.Webhooks = []admissionregistrationv1.ValidatingWebhook{
		{Name: "validate-pod"},
	}
	lister := newValidatingWebhookConfigLister(vwc)

	result, err := GetValidatingWebhookConfigByName(lister, "pod-policy")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.Name != "pod-policy" {
		t.Errorf("Name = %q; want %q", result.Name, "pod-policy")
	}
	if len(result.Webhooks) != 1 {
		t.Errorf("Webhooks length = %d; want 1", len(result.Webhooks))
	}
}

func TestGetValidatingWebhookConfigByName_NotFound(t *testing.T) {
	vwc := makeValidatingWebhookConfig("pod-policy")
	lister := newValidatingWebhookConfigLister(vwc)

	_, err := GetValidatingWebhookConfigByName(lister, "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent ValidatingWebhookConfig; got nil")
	}
}

func TestMapValidatingWebhook_NilClientConfigService_EmptyStrings(t *testing.T) {
	wh := admissionregistrationv1.ValidatingWebhook{
		Name:         "test",
		ClientConfig: admissionregistrationv1.WebhookClientConfig{Service: nil},
	}

	got := mapValidatingWebhook(wh)
	if got.ClientConfigServiceName != "" {
		t.Errorf("ClientConfigServiceName = %q; want empty", got.ClientConfigServiceName)
	}
	if got.ClientConfigServiceNamespace != "" {
		t.Errorf("ClientConfigServiceNamespace = %q; want empty", got.ClientConfigServiceNamespace)
	}
}

func TestMapValidatingWebhook_WithClientConfigService(t *testing.T) {
	wh := admissionregistrationv1.ValidatingWebhook{
		Name: "test",
		ClientConfig: admissionregistrationv1.WebhookClientConfig{
			Service: &admissionregistrationv1.ServiceReference{
				Name:      "webhook-svc",
				Namespace: "webhooks",
			},
		},
	}

	got := mapValidatingWebhook(wh)
	if got.ClientConfigServiceName != "webhook-svc" {
		t.Errorf("ClientConfigServiceName = %q; want %q", got.ClientConfigServiceName, "webhook-svc")
	}
	if got.ClientConfigServiceNamespace != "webhooks" {
		t.Errorf("ClientConfigServiceNamespace = %q; want %q", got.ClientConfigServiceNamespace, "webhooks")
	}
}

func TestMapValidatingWebhook_NilMatchPolicy_EmptyString(t *testing.T) {
	wh := admissionregistrationv1.ValidatingWebhook{
		Name:        "test",
		MatchPolicy: nil,
	}

	got := mapValidatingWebhook(wh)
	if got.MatchPolicy != "" {
		t.Errorf("MatchPolicy = %q; want empty", got.MatchPolicy)
	}
}

func TestMapValidatingWebhook_WithMatchPolicy(t *testing.T) {
	wh := admissionregistrationv1.ValidatingWebhook{
		Name: "test",
	}
	policy := admissionregistrationv1.Exact
	wh.MatchPolicy = &policy

	got := mapValidatingWebhook(wh)
	if got.MatchPolicy != string(admissionregistrationv1.Exact) {
		t.Errorf("MatchPolicy = %q; want %q", got.MatchPolicy, string(admissionregistrationv1.Exact))
	}
}

func TestMapValidatingWebhook_NilFailurePolicy_EmptyString(t *testing.T) {
	wh := admissionregistrationv1.ValidatingWebhook{
		Name:          "test",
		FailurePolicy: nil,
	}

	got := mapValidatingWebhook(wh)
	if got.FailurePolicy != "" {
		t.Errorf("FailurePolicy = %q; want empty", got.FailurePolicy)
	}
}

func TestMapValidatingWebhook_NilSideEffects_EmptyString(t *testing.T) {
	wh := admissionregistrationv1.ValidatingWebhook{
		Name:        "test",
		SideEffects: nil,
	}

	got := mapValidatingWebhook(wh)
	if got.SideEffects != "" {
		t.Errorf("SideEffects = %q; want empty", got.SideEffects)
	}
}

func TestMapValidatingWebhook_NilTimeoutSeconds_ZeroValue(t *testing.T) {
	wh := admissionregistrationv1.ValidatingWebhook{
		Name:           "test",
		TimeoutSeconds: nil,
	}

	got := mapValidatingWebhook(wh)
	if got.TimeoutSeconds != 0 {
		t.Errorf("TimeoutSeconds = %d; want 0", got.TimeoutSeconds)
	}
}

func TestMapValidatingWebhook_WithTimeoutSeconds(t *testing.T) {
	wh := admissionregistrationv1.ValidatingWebhook{
		Name: "test",
	}
	timeout := int32(30)
	wh.TimeoutSeconds = &timeout

	got := mapValidatingWebhook(wh)
	if got.TimeoutSeconds != 30 {
		t.Errorf("TimeoutSeconds = %d; want 30", got.TimeoutSeconds)
	}
}

func TestMapValidatingWebhook_EmptyRules_DefaultValues(t *testing.T) {
	wh := admissionregistrationv1.ValidatingWebhook{
		Name:  "test",
		Rules: []admissionregistrationv1.RuleWithOperations{},
	}

	got := mapValidatingWebhook(wh)
	if len(got.RulesAPIGroups) != 0 {
		t.Errorf("RulesAPIGroups length = %d; want 0", len(got.RulesAPIGroups))
	}
	if got.RulesScope != "*" {
		t.Errorf("RulesScope = %q; want %q", got.RulesScope, "*")
	}
}

func TestMatchExpressionToString(t *testing.T) {
	expr := metav1.LabelSelectorRequirement{
		Key:      "version",
		Operator: metav1.LabelSelectorOpIn,
		Values:   []string{"v1", "v2"},
	}

	got := matchExpressionToString(expr)
	if !contains(got, "version") || !contains(got, "In") {
		t.Errorf("got %q; expected to contain 'version' and 'In'", got)
	}
}
