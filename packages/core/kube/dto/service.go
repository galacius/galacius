package dto

type ServiceRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type ManagedField struct {
	Manager    string
	Operation  string
	FieldsYAML string
}

type ServicePort struct {
	Name       string
	Port       int32
	TargetPort string
	Protocol   string
	NodePort   int32
}

type Service struct {
	Name       string
	Namespace  string
	Type       string
	ClusterIP  string
	Ports      string
	ExternalIP string
	Selector   map[string]string
	Age        string
	Status     string

	// detail fields
	CreatedAt             string
	Labels                map[string]string
	Annotations           map[string]string
	ManagedFields         []ManagedField
	SessionAffinity       string
	InternalTrafficPolicy string
	ClusterIPs            []string
	IPFamilyPolicy        string
	IPFamilies            []string
	ServicePorts          []ServicePort
}
