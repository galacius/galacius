package dto

type DaemonSetRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type DaemonSet struct {
	Name          string
	Namespace     string
	Pods          string
	NodeSelector  map[string]string
	Age           string
	CreatedAt     string
	Labels        map[string]string
	Annotations   map[string]string
	ManagedFields []ManagedField
	Selector      map[string]string
	Images        []string
	StrategyType  string
	Tolerations   int
	PodStatus     string
}

type DaemonSetSummary struct {
	Running int
	Pending int
}
