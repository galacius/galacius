package dto

type NetworkPolicyRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type NetworkPolicy struct {
	Name        string
	Namespace   string
	PolicyTypes string
	Age         string
}

type NetworkPolicyDetail struct {
	Name          string
	Namespace     string
	CreatedAt     string
	Labels        map[string]string
	Annotations   map[string]string
	ManagedFields []ManagedField
	PodSelector   map[string]string
	IngressRules  []NetworkPolicyIngressRule
	EgressRules   []NetworkPolicyEgressRule
}

type NetworkPolicyIngressRule struct {
	Ports []string // e.g. "TCP:8080", "UDP:53"
	From  []NetworkPolicyPeer
}

type NetworkPolicyEgressRule struct {
	Ports []string
	To    []NetworkPolicyPeer
}

type NetworkPolicyPeer struct {
	PodSelector       map[string]string
	NamespaceSelector map[string]string
	IPBlock           string // CIDR notation
}
