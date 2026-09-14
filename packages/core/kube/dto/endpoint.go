package dto

type EndpointRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type EndpointAddress struct {
	IP         string
	Hostname   string
	TargetName string
}

type EndpointPort struct {
	Name     string
	Port     int32
	Protocol string
}

type EndpointSubset struct {
	Addresses []EndpointAddress
	Ports     []EndpointPort
}

type Endpoint struct {
	Name      string
	Namespace string
	Endpoints string
	Age       string

	CreatedAt     string
	Labels        map[string]string
	Annotations   map[string]string
	ManagedFields []ManagedField
	Subsets       []EndpointSubset
}
