package dto

// StartResult is returned by StartPortForward with the session ID and assigned local port.
type StartResult struct {
	ID        string
	LocalPort string
}

// PortForward represents an active or stopped port-forward session.
type PortForward struct {
	ID         string
	Name       string
	Namespace  string
	Kind       string
	PodPort     string
	TargetPort  string
	ServicePort string
	LocalPort   string
	Scheme      string
	Protocol   string
	Address    string
	Status     string
}
