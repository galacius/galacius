package dto

type CRBSubject struct {
	Kind      string
	Name      string
	Namespace string
}

type ClusterRoleBindingRef struct {
	Name string `json:"name"`
}

type ClusterRoleBinding struct {
	Name          string
	Bindings      string
	Age           string
	CreatedAt     string
	Labels        map[string]string
	Annotations   map[string]string
	ManagedFields []ManagedField
	RoleRefKind   string
	RoleRefName   string
	RoleRefGroup  string
	Subjects      []CRBSubject
}
