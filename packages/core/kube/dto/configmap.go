package dto

type ConfigMapRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type ConfigMap struct {
	Name          string
	Namespace     string
	Keys          []string
	Age           string
	CreatedAt     string
	Labels        map[string]string
	Annotations   map[string]string
	ManagedFields []ManagedField
	Data          map[string]string
}
