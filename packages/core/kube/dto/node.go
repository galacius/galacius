package dto

// NodeUsage holds raw CPU and memory usage for a node from metrics-server.
type NodeUsage struct {
	CPUMilliCores int64
	MemoryBytes   int64
}

type NodeAddress struct {
	Type    string
	Address string
}

type NodeCondition struct {
	Type               string
	Status             string
	Reason             string
	Message            string
	LastHeartbeatTime  string
	LastTransitionTime string
}

type Node struct {
	Name          string
	Roles         string
	Version       string
	Age           string
	Taints        int
	Unschedulable bool
	CPU           string
	CPUPercent    int
	Memory        string
	MemPercent    int
	Disk          string
	DiskPercent   int

	CreatedAt        string
	Labels           map[string]string
	Annotations      map[string]string
	ManagedFields    []ManagedField
	Addresses        []NodeAddress
	OS               string
	OSImage          string
	KernelVersion    string
	ContainerRuntime string
	Conditions       []NodeCondition
	Capacity         map[string]string
	Allocatable      map[string]string

	// Capacity cache for metrics enrichment — excluded from JSON serialization.
	CPUCapMilliCores int64  `json:"-"`
	MemCapBytes      int64  `json:"-"`
	MemCapStr        string `json:"-"`
}
