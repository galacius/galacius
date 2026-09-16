package dto

type ServiceAccountRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type ServiceAccount struct {
	Name      string
	Namespace string
	Age       string
	CreatedAt string
	Secrets   []string
}
