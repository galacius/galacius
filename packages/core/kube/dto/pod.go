package dto

type PodRef struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

type PodCondition struct {
	Type               string
	Status             string
	Message            string
	Reason             string
	LastProbeTime      string
	LastTransitionTime string
}

type PodContainerPort struct {
	Name          string
	HostIP        string
	HostPort      int32
	ContainerPort int32
	Protocol      string
}

type PodContainerMount struct {
	Path     string
	Name     string
	ReadOnly bool
}

type PodContainerLastStatus struct {
	Reason   string
	ExitCode int32
	Started  string
	Finished string
}

type PodContainerDetail struct {
	Name          string
	Status        string
	Image         string
	Ready         bool
	RestartCount  int32
	LastStatus    *PodContainerLastStatus
	Ports         []PodContainerPort
	EnvVars       []string
	Mounts        []PodContainerMount
	Liveness      string
	Readiness     string
	Startup       string
	Command       []string
	Args          []string
	StatusMessage string
	CPURequest    string
	CPULimit      string
	MemRequest    string
	MemLimit      string
	DiskRequest   string
	DiskLimit     string
	ContainerID   string
	Reason        string
	ExitCode      *int32
	StartedAt     string
	FinishedAt    string
}

type PodVolumeSource struct {
	Type       string
	Name       string
	Items      []string
	Expiration string
	Path       string
}

type PodVolume struct {
	Name          string
	Kind          string
	HostPath      string
	CheckBehavior string
	Medium        string
	DefaultMode   string
	Sources       []PodVolumeSource
}

type Pod struct {
	Name         string
	Namespace    string
	Status       string
	Ready        string
	Containers   int32
	Restarts     int32
	ControlledBy string
	NodeName     string
	QoS          string
	Age          string

	CPU         string
	Memory      string
	Disk        string
	CPUPercent  int
	MemPercent  int
	DiskPercent int

	// raw values used by ApplyPodMetrics
	CPUReqMilli  int64
	CPULimMilli  int64
	MemReqBytes  int64
	MemLimBytes  int64
	DiskReqBytes int64
	DiskLimBytes int64

	CreatedAt              string
	ServiceAccount         string
	PriorityClass          string
	TerminationGracePeriod string
	ControlledByName       string
	HostIPs                []string
	PodIPs                 []string
	Tolerations            int
	TolerationDetails      []TolerationDetail
	AffinityCount          int
	Affinities             string
	Labels                 map[string]string
	Annotations            map[string]string
	ManagedFields          []ManagedField
	Conditions             []PodCondition
	ContainerDetails       []PodContainerDetail
	InitContainerDetails   []PodContainerDetail
	Volumes                []PodVolume
}

type TolerationDetail struct {
	Key      string
	Operator string
	Value    string
	Effect   string
	Seconds  *int64
}

type PodUsage struct {
	CPUMilliCores int64
	MemoryBytes   int64
}

type PodSummary struct {
	Running   int
	Pending   int
	Failed    int
	Succeeded int
	Evicted   int
}
