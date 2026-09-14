package dto

type LeaseRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type Lease struct {
	Name                 string
	Namespace            string
	HolderIdentity       string
	LeaseDurationSeconds int32
	RenewTime            string
	AcquireTime          string
	LeaseTransitions     int32
	Age                  string
	CreatedAt            string
	Labels               map[string]string
	Annotations          map[string]string
	ManagedFields        []ManagedField
}
