package dto

type IngressRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type Ingress struct {
	Name          string
	Namespace     string
	LoadBalancers string
	Rules         []IngressRule
	Age           string
}

type IngressPath struct {
	Path    string
	Backend string // "serviceName:portNameOrNumber"
}

type IngressRule struct {
	Host  string
	Paths []IngressPath
}

type IngressDetail struct {
	Name          string
	Namespace     string
	Age           string
	CreatedAt     string // RFC3339 — MUST be string, not time.Time (Wails limitation)
	Labels        map[string]string
	Annotations   map[string]string
	LoadBalancers string // comma-separated IPs/hostnames
	Ports         string // comma-separated unique port numbers/names from rules
	Rules         []IngressRule
}
