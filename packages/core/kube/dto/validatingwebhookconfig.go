package dto

type ValidatingWebhookConfigRef struct {
	Name string `json:"name"`
}

type ValidatingWebhookConfig struct {
	Name     string
	Webhooks int
	Age      string
}

type ValidatingWebhookConfigDetail struct {
	Name        string
	APIVersion  string
	CreatedAt   string // ISO string, NOT time.Time
	Labels      map[string]string
	Annotations map[string]string
	Webhooks    []WebhookDetail
}

type WebhookDetail struct {
	Name                         string
	ClientConfigServiceName      string
	ClientConfigServiceNamespace string
	MatchPolicy                  string
	FailurePolicy                string
	AdmissionReviewVersions      []string
	SideEffects                  string
	TimeoutSeconds               int32
	NamespaceSelectorExpressions string // human-readable, e.g. "Match Expressions:"
	ObjectSelectorExpressions    string
	RulesAPIGroups               []string
	RulesAPIVersions             []string
	RulesOperations              []string
	RulesResources               []string
	RulesScope                   string
}
