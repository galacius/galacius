package kubeResources

import (
	"fmt"
	"strings"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersadmissionregistrationv1 "k8s.io/client-go/listers/admissionregistration/v1"
)

func toValidatingWebhookConfig(vwc *admissionregistrationv1.ValidatingWebhookConfiguration) dto.ValidatingWebhookConfig {
	return dto.ValidatingWebhookConfig{
		Name:     vwc.Name,
		Webhooks: len(vwc.Webhooks),
		Age:      humanAge(vwc.CreationTimestamp.Time),
	}
}

func ListValidatingWebhookConfigs(lister listersadmissionregistrationv1.ValidatingWebhookConfigurationLister) ([]dto.ValidatingWebhookConfig, error) {
	vwcs, err := lister.List(labels.Everything())
	if err != nil {
		return nil, err
	}
	result := make([]dto.ValidatingWebhookConfig, len(vwcs))
	for i, vwc := range vwcs {
		result[i] = toValidatingWebhookConfig(vwc)
	}
	return result, nil
}

func GetValidatingWebhookConfigByName(lister listersadmissionregistrationv1.ValidatingWebhookConfigurationLister, name string) (*dto.ValidatingWebhookConfigDetail, error) {
	vwc, err := lister.Get(name)
	if err != nil {
		return nil, err
	}

	webhooks := make([]dto.WebhookDetail, len(vwc.Webhooks))
	for i, wh := range vwc.Webhooks {
		webhooks[i] = mapValidatingWebhook(wh)
	}

	return &dto.ValidatingWebhookConfigDetail{
		Name:        vwc.Name,
		APIVersion:  vwc.APIVersion,
		CreatedAt:   vwc.CreationTimestamp.Time.Format(time.RFC3339),
		Labels:      vwc.Labels,
		Annotations: vwc.Annotations,
		Webhooks:    webhooks,
	}, nil
}

func mapValidatingWebhook(wh admissionregistrationv1.ValidatingWebhook) dto.WebhookDetail {
	// Extract ClientConfig
	clientConfigServiceName := ""
	clientConfigServiceNamespace := ""
	if wh.ClientConfig.Service != nil {
		clientConfigServiceName = wh.ClientConfig.Service.Name
		clientConfigServiceNamespace = wh.ClientConfig.Service.Namespace
	}

	// Extract MatchPolicy, FailurePolicy, SideEffects (dereference pointers safely)
	matchPolicy := ""
	if wh.MatchPolicy != nil {
		matchPolicy = string(*wh.MatchPolicy)
	}

	failurePolicy := ""
	if wh.FailurePolicy != nil {
		failurePolicy = string(*wh.FailurePolicy)
	}

	sideEffects := ""
	if wh.SideEffects != nil {
		sideEffects = string(*wh.SideEffects)
	}

	// Extract TimeoutSeconds (dereference pointer, nil → 0)
	timeoutSeconds := int32(0)
	if wh.TimeoutSeconds != nil {
		timeoutSeconds = *wh.TimeoutSeconds
	}

	// Extract AdmissionReviewVersions
	admissionReviewVersions := wh.AdmissionReviewVersions

	// Extract NamespaceSelectorExpressions
	namespaceSelectorExpressions := "Match Expressions:"
	if wh.NamespaceSelector != nil && len(wh.NamespaceSelector.MatchExpressions) > 0 {
		exprs := make([]string, len(wh.NamespaceSelector.MatchExpressions))
		for j, me := range wh.NamespaceSelector.MatchExpressions {
			exprs[j] = matchExpressionToString(me)
		}
		namespaceSelectorExpressions = "Match Expressions: " + strings.Join(exprs, ", ")
	}

	// Extract ObjectSelectorExpressions
	objectSelectorExpressions := "Match Expressions:"
	if wh.ObjectSelector != nil && len(wh.ObjectSelector.MatchExpressions) > 0 {
		exprs := make([]string, len(wh.ObjectSelector.MatchExpressions))
		for j, me := range wh.ObjectSelector.MatchExpressions {
			exprs[j] = matchExpressionToString(me)
		}
		objectSelectorExpressions = "Match Expressions: " + strings.Join(exprs, ", ")
	}

	// Extract Rules
	rulesAPIGroups := []string{}
	rulesAPIVersions := []string{}
	rulesOperations := []string{}
	rulesResources := []string{}
	rulesScope := "*"

	if len(wh.Rules) > 0 {
		rule := wh.Rules[0] // take first rule (VWC typically has single rule)
		rulesAPIGroups = rule.APIGroups
		rulesAPIVersions = rule.APIVersions
		// Convert Operations ([]OperationType) to strings
		for _, op := range rule.Operations {
			rulesOperations = append(rulesOperations, string(op))
		}
		rulesResources = rule.Resources
		if rule.Scope != nil {
			rulesScope = string(*rule.Scope)
		}
	}

	return dto.WebhookDetail{
		Name:                         wh.Name,
		ClientConfigServiceName:      clientConfigServiceName,
		ClientConfigServiceNamespace: clientConfigServiceNamespace,
		MatchPolicy:                  matchPolicy,
		FailurePolicy:                failurePolicy,
		AdmissionReviewVersions:      admissionReviewVersions,
		SideEffects:                  sideEffects,
		TimeoutSeconds:               timeoutSeconds,
		NamespaceSelectorExpressions: namespaceSelectorExpressions,
		ObjectSelectorExpressions:    objectSelectorExpressions,
		RulesAPIGroups:               rulesAPIGroups,
		RulesAPIVersions:             rulesAPIVersions,
		RulesOperations:              rulesOperations,
		RulesResources:               rulesResources,
		RulesScope:                   rulesScope,
	}
}

func matchExpressionToString(me metav1.LabelSelectorRequirement) string {
	return fmt.Sprintf("%s %s [%s]", me.Key, me.Operator, strings.Join(me.Values, ","))
}
