package dto

type SecretRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type Secret struct {
	Name      string
	Namespace string
	Labels    []string
	Keys      []string
	Type      string
	Age       string
}

type SecretDetail struct {
	Name        string
	Namespace   string
	Type        string
	Age         string
	CreatedAt   string
	Labels      map[string]string
	Annotations map[string]string
	Data        map[string]string
}
