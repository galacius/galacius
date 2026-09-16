package dto

type RoleRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type Role struct {
	Name          string
	Namespace     string
	Age           string
	CreatedAt     string
	Labels        map[string]string
	Annotations   map[string]string
	ManagedFields []ManagedField
	Rules         []PolicyRule
}
