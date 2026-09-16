package kubeResources

import (
	"fmt"
	"strings"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

// formatNodeResource converts a Kubernetes resource quantity to a human-readable string.
func formatNodeResource(key string, q resource.Quantity) string {
	switch {
	case key == "cpu":
		milli := q.MilliValue()
		if milli%1000 == 0 {
			return fmt.Sprintf("%d", milli/1000)
		}
		return fmt.Sprintf("%dm", milli)
	case key == "memory" || key == "ephemeral-storage" || strings.HasPrefix(key, "hugepages-"):
		bytes := q.Value()
		if bytes == 0 {
			return "0"
		}
		const (
			gib = int64(1 << 30)
			mib = int64(1 << 20)
			kib = int64(1 << 10)
		)
		switch {
		case bytes >= gib:
			return fmt.Sprintf("%.1f GiB", float64(bytes)/float64(gib))
		case bytes >= mib:
			return fmt.Sprintf("%.1f MiB", float64(bytes)/float64(mib))
		case bytes >= kib:
			return fmt.Sprintf("%.1f KiB", float64(bytes)/float64(kib))
		default:
			return fmt.Sprintf("%d B", bytes)
		}
	default:
		return q.String()
	}
}

// dto.NodeUsage holds raw CPU and memory usage for a node from metrics-server.
func toNode(node *corev1.Node) dto.Node {
	var roles []string
	const rolePrefix = "node-role.kubernetes.io/"
	for label := range node.Labels {
		if role, ok := strings.CutPrefix(label, rolePrefix); ok {
			roles = append(roles, role)
		}
	}
	rolesStr := "<none>"
	if len(roles) > 0 {
		rolesStr = strings.Join(roles, ",")
	}

	CPUCapMilliCores := int64(0)
	cpuCapStr := "<none>"
	if q, ok := node.Status.Capacity[corev1.ResourceCPU]; ok {
		CPUCapMilliCores = q.MilliValue()
		cpuCapStr = fmt.Sprintf("%.0f", float64(CPUCapMilliCores)/1000)
	}

	MemCapBytes := int64(0)
	MemCapStr := "<none>"
	if q, ok := node.Status.Capacity[corev1.ResourceMemory]; ok {
		MemCapBytes = q.Value()
		MemCapStr = fmt.Sprintf("%.1f", float64(MemCapBytes)/(1024*1024*1024))
	}

	diskStr := "<none>"
	diskPercent := 0
	diskCap, hasCap := node.Status.Capacity[corev1.ResourceEphemeralStorage]
	diskAlloc, hasAlloc := node.Status.Allocatable[corev1.ResourceEphemeralStorage]
	if hasCap && hasAlloc {
		capBytes := diskCap.Value()
		usedBytes := max(capBytes-diskAlloc.Value(), 0)
		if capBytes > 0 {
			diskPercent = int(float64(usedBytes) / float64(capBytes) * 100)
		}
		diskStr = fmt.Sprintf("%.1f / %.1f Gi",
			float64(usedBytes)/(1024*1024*1024),
			float64(capBytes)/(1024*1024*1024))
	}

	return dto.Node{
		Name:          node.Name,
		Roles:         rolesStr,
		Version:       node.Status.NodeInfo.KubeletVersion,
		Age:           humanAge(node.CreationTimestamp.Time),
		Taints:        len(node.Spec.Taints),
		Unschedulable: node.Spec.Unschedulable,
		CPU:           fmt.Sprintf("N/A / %s", cpuCapStr),
		CPUPercent:    0,
		Memory:        fmt.Sprintf("N/A / %s Gi", MemCapStr),
		MemPercent:    0,
		Disk:          diskStr,
		DiskPercent:   diskPercent,
		CreatedAt:     node.CreationTimestamp.Format(time.RFC3339),
		Labels: func() map[string]string {
			if node.Labels == nil {
				return map[string]string{}
			}
			return node.Labels
		}(),
		Annotations: func() map[string]string {
			if node.Annotations == nil {
				return map[string]string{}
			}
			return node.Annotations
		}(),
		ManagedFields: toManagedFields(node),
		Addresses: func() []dto.NodeAddress {
			out := make([]dto.NodeAddress, 0, len(node.Status.Addresses))
			for _, a := range node.Status.Addresses {
				out = append(out, dto.NodeAddress{Type: string(a.Type), Address: a.Address})
			}
			return out
		}(),
		OS:               node.Status.NodeInfo.OperatingSystem,
		OSImage:          node.Status.NodeInfo.OSImage,
		KernelVersion:    node.Status.NodeInfo.KernelVersion,
		ContainerRuntime: node.Status.NodeInfo.ContainerRuntimeVersion,
		Conditions: func() []dto.NodeCondition {
			out := make([]dto.NodeCondition, 0, len(node.Status.Conditions))
			for _, c := range node.Status.Conditions {
				out = append(out, dto.NodeCondition{
					Type:               string(c.Type),
					Status:             string(c.Status),
					Reason:             c.Reason,
					Message:            c.Message,
					LastHeartbeatTime:  c.LastHeartbeatTime.Format(time.RFC3339),
					LastTransitionTime: c.LastTransitionTime.Format(time.RFC3339),
				})
			}
			return out
		}(),
		Capacity: func() map[string]string {
			out := make(map[string]string, len(node.Status.Capacity))
			for k, v := range node.Status.Capacity {
				out[string(k)] = formatNodeResource(string(k), v)
			}
			return out
		}(),
		Allocatable: func() map[string]string {
			out := make(map[string]string, len(node.Status.Allocatable))
			for k, v := range node.Status.Allocatable {
				out[string(k)] = formatNodeResource(string(k), v)
			}
			return out
		}(),
		CPUCapMilliCores: CPUCapMilliCores,
		MemCapBytes:      MemCapBytes,
		MemCapStr:        MemCapStr,
	}
}

func GetNodeByName(lister listerscorev1.NodeLister, name string) (dto.Node, error) {
	n, err := lister.Get(name)
	if err != nil {
		return dto.Node{}, err
	}
	return toNode(n), nil
}

func ListNodes(lister listerscorev1.NodeLister) ([]dto.Node, error) {
	nodes, err := lister.List(labels.Everything())
	if err != nil {
		return nil, err
	}
	result := make([]dto.Node, len(nodes))
	for i, n := range nodes {
		result[i] = toNode(n)
	}
	return result, nil
}

// ApplyNodeMetrics merges live CPU/memory usage from metrics-server into the
// DTOs. If a node has no entry in the usage map, its fields remain "N/A".
func ApplyNodeMetrics(nodes []dto.Node, usage map[string]dto.NodeUsage) []dto.Node {
	for i, n := range nodes {
		u, ok := usage[n.Name]
		if !ok {
			continue
		}
		cpuPercent := 0
		if n.CPUCapMilliCores > 0 {
			cpuPercent = min(int(float64(u.CPUMilliCores)/float64(n.CPUCapMilliCores)*100), 100)
		}
		nodes[i].CPU = fmt.Sprintf("%.1f / %s",
			float64(u.CPUMilliCores)/1000,
			fmt.Sprintf("%.0f", float64(n.CPUCapMilliCores)/1000))
		nodes[i].CPUPercent = cpuPercent

		memPercent := 0
		if n.MemCapBytes > 0 {
			memPercent = min(int(float64(u.MemoryBytes)/float64(n.MemCapBytes)*100), 100)
		}
		nodes[i].Memory = fmt.Sprintf("%.1f / %s Gi",
			float64(u.MemoryBytes)/(1024*1024*1024),
			n.MemCapStr)
		nodes[i].MemPercent = memPercent
	}
	return nodes
}
