package dto

type LimitRangeRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type LimitRange struct {
	Name      string
	Namespace string
	Age       string
}

type LimitRangeDetail struct {
	Name        string
	Namespace   string
	CreatedAt   string
	Age         string
	Labels      map[string]string
	Annotations map[string]string
	Limits      map[string]map[string]map[string]string
}
