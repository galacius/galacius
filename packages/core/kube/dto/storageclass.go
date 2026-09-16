package dto

type StorageClassRef struct {
	Name string `json:"name"`
}

type StorageClass struct {
	Name              string
	Provisioner       string
	ReclaimPolicy     string
	Default           bool
	Age               string
	CreatedAt         string
	Labels            map[string]string
	Annotations       map[string]string
	ManagedFields     []ManagedField
	VolumeBindingMode string
	MountOptions      []string
	Parameters        map[string]string
}
