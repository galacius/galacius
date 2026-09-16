package dto

type RBSubject struct {
	Kind      string
	Name      string
	Namespace string
}

type RoleBindingRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type RoleBinding struct {
	Name          string
	Namespace     string
	Bindings      string
	Age           string
	RoleRefName   string
	Types         string
	CreatedAt     string
	Labels        map[string]string
	Annotations   map[string]string
	ManagedFields []ManagedField
	RoleRefKind   string
	RoleRefGroup  string
	Subjects      []RBSubject
}
