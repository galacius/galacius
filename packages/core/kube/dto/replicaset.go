package dto

type ReplicaSetRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type ReplicaSet struct {
	Name           string
	Namespace      string
	Desired        int32
	Current        int32
	Ready          int32
	Age            string
	OwnerName      string
	CreatedAt      string
	OwnerKind      string
	Labels         map[string]string
	Annotations    map[string]string
	ManagedFields  []ManagedField
	Selector       map[string]string
	NodeSelector   map[string]string
	Images         []string
	ReplicasDetail string
	Tolerations    int
	Affinities     int
	PodStatus      string
	HealthStatus   string
	HealthMessage  string
}

type ReplicaSetSummary struct {
	Running int
	Pending int
}
