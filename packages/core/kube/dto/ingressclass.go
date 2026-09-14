package dto

type IngressClassRef struct {
	Name string `json:"name"`
}

type IngressClass struct {
	Name        string
	Controller  string
	IsDefault   bool
	Age         string
	CreatedAt   string
	Labels      map[string]string
	Annotations map[string]string
}
