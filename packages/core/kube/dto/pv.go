package dto

type PersistentVolumeRef struct {
	Name string `json:"name"`
}

type PersistentVolume struct {
	Name         string
	StorageClass string
	Capacity     string
	Claim        string // "namespace/name" of the bound PVC, or "-"
	Age          string
	Status       string
}

type PersistentVolumeDetail struct {
	Name                string
	Capacity            string
	AccessModes         []string
	ReclaimPolicy       string
	Status              string
	StorageClass        string
	Claim               string
	VolumeMode          string
	MountOptions        []string
	NodeAffinitySummary string
	Age                 string
	CreatedAt           string
	Labels              map[string]string
	Annotations         map[string]string
}
