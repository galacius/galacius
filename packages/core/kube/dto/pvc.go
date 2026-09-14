package dto

type PersistentVolumeClaimRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type PersistentVolumeClaim struct {
	Name         string
	Namespace    string
	StorageClass string
	Size         string
	Pods         string // comma-joined names of pods mounting this claim
	Age          string
	Status       string
}

type PersistentVolumeClaimDetail struct {
	Name         string
	Namespace    string
	StorageClass string
	Size         string
	Pods         []string
	Age          string
	CreatedAt    string
	Status       string
	Labels       map[string]string
	Annotations  map[string]string
	Finalizers   []string
	AccessModes  []string
	MatchLabels  map[string]string
	MatchExprs   []string
}
