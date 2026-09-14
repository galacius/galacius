package dto

type DeploymentRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type DeploymentCondition struct {
	Type               string
	Status             string
	Message            string
	Reason             string
	LastTransitionTime string
	LastUpdateTime     string
}

type Deployment struct {
	Name              string
	Namespace         string
	Pods              string
	Replicas          int32
	Age               string
	CreatedAt         string
	Labels            map[string]string
	Annotations       map[string]string
	ManagedFields     []ManagedField
	ReplicasDetail    string
	Selector          map[string]string
	NodeSelector      map[string]string
	StrategyType      string
	MaxSurge          string
	MaxUnavailable    string
	Conditions        []DeploymentCondition
	Tolerations       int
	TolerationDetails []TolerationDetail
	AffinityCount     int
	Affinities        string
}

type DeploymentSummary struct {
	Running int
	Pending int
}
