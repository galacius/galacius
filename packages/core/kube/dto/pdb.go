package dto

type PodDisruptionBudgetRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type PodDisruptionBudget struct {
	Name           string
	Namespace      string
	MinAvailable   string
	MaxUnavailable string
	CurrentHealthy int32
	DesiredHealthy int32
	Age            string
}

type PodDisruptionBudgetDetail struct {
	Name           string
	Namespace      string
	MinAvailable   string
	MaxUnavailable string
	CurrentHealthy int32
	DesiredHealthy int32
	Age            string
	CreatedAt      string
	Labels         map[string]string
	Annotations    map[string]string
	Selector       map[string]string
}
