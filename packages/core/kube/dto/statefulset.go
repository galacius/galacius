package dto

type StatefulSetRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type StatefulSet struct {
	Name          string
	Namespace     string
	Pods          string
	Replicas      int32
	Age           string
	CreatedAt     string
	Labels        map[string]string
	Annotations   map[string]string
	ManagedFields []ManagedField
	Selector      map[string]string
	Images        []string
	Affinities    int
	PodStatus     string
	HealthStatus  string
	HealthMessage string
}

type StatefulSetSummary struct {
	Running int
	Pending int
}
