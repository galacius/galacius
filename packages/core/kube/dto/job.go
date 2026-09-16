package dto

type JobRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type JobCondition struct {
	Type               string
	Status             string
	Message            string
	Reason             string
	LastProbeTime      string
	LastTransitionTime string
}

type Job struct {
	Name        string
	Namespace   string
	Completions int32
	Age         string
	Conditions  []JobCondition
	Resumed     bool
	Status      string
	Succeeded   int32
	Parallelism int32
	Duration    string

	CreatedAt      string
	Labels         map[string]string
	Annotations    map[string]string
	ManagedFields  []ManagedField
	Selector       map[string]string
	CompletionMode string
	StartTime      string
	StartTimeAge   string
	CompletedAt    string
	CompletedAtAge string
	PodsStatuses   []string
	OwnerKind      string
	OwnerName      string
}

type JobSummary struct {
	Succeeded int
	Failed    int
	Pending   int
}
