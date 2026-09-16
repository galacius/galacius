package dto

type EndpointSliceRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type EndpointSliceEndpoint struct {
	Addresses   []string
	Hostname    string
	NodeName    string
	Zone        string
	TargetName  string
	TargetKind  string
	Ready       bool
	Serving     bool
	Terminating bool
}

type EndpointSlicePort struct {
	Name     string
	Port     int32
	Protocol string
}

type EndpointSlice struct {
	// list view
	Name        string
	Namespace   string
	AddressType string
	Ports       []EndpointSlicePort
	Endpoints   []EndpointSliceEndpoint
	Age         string
	// detail view
	CreatedAt     string
	Labels        map[string]string
	Annotations   map[string]string
	ManagedFields []ManagedField
	ControlledBy  string
	ServiceName   string
}
