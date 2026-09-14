package dto

type PolicyRule struct {
	Resources       []string
	Verbs           []string
	APIGroups       []string
	ResourceNames   []string
	NonResourceURLs []string
}

type ClusterRoleRef struct {
	Name string `json:"name"`
}

type ClusterRole struct {
	Name          string
	Age           string
	CreatedAt     string
	Labels        map[string]string
	Annotations   map[string]string
	ManagedFields []ManagedField
	Rules         []PolicyRule
}
