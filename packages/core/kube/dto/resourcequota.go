package dto

type ResourceQuotaRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type ResourceQuota struct {
	Name      string
	Namespace string
	Age       string
}

type ResourceQuotaDetail struct {
	Name        string
	Namespace   string
	Age         string
	CreatedAt   string
	Labels      map[string]string
	Annotations map[string]string
	Hard        map[string]string
	Used        map[string]string
}
