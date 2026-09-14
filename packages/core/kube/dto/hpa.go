package dto

type HPARef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type ScaleTargetRef struct {
	Kind string
	Name string
}

type HPAMetric struct {
	Name    string
	Current string
	Target  string
}

type HPADetail struct {
	Name         string
	Namespace    string
	CreatedAt    string
	Labels       map[string]string
	Annotations  map[string]string
	ScaleTargetRef ScaleTargetRef
	Metrics      []HPAMetric
	MinPods      int32
	MaxPods      int32
	Replicas     int32
	Status       string
	Age          string
}

type HPA struct {
	Name      string
	Namespace string
	Metrics   string
	MinPods   int32
	MaxPods   int32
	Replicas  int32
	Age       string
	Status    string
}
