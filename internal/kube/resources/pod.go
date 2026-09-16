package kubeResources

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	sigsyaml "sigs.k8s.io/yaml"
)

func formatCPUMilli(m int64) string {
	if m <= 0 {
		return "—"
	}
	return fmt.Sprintf("%dm", m)
}

func formatMemBytes(b int64) string {
	if b <= 0 {
		return "—"
	}
	mib := float64(b) / (1024 * 1024)
	if mib >= 1024 {
		return fmt.Sprintf("%.1fGi", mib/1024)
	}
	return fmt.Sprintf("%.0fMi", mib)
}

func resourcePercent(usage, limit, req int64) int {
	denom := limit
	if denom <= 0 {
		denom = req
	}
	if denom <= 0 || usage <= 0 {
		return 0
	}
	p := int(float64(usage) / float64(denom) * 100)
	if p > 100 {
		return 100
	}
	return p
}

func resourceLabel(usage, req, lim int64, format func(int64) string) string {
	return fmt.Sprintf("%s / %s / %s", format(usage), format(req), format(lim))
}

func probeString(p *corev1.Probe) string {
	if p == nil {
		return ""
	}
	var handler string
	switch {
	case p.HTTPGet != nil:
		h := p.HTTPGet
		scheme := strings.ToLower(string(h.Scheme))
		if scheme == "" {
			scheme = "http"
		}
		handler = fmt.Sprintf("http-get %s://%s%s%s", scheme, h.Host, h.Port.String(), h.Path)
	case p.Exec != nil:
		handler = "exec " + strings.Join(p.Exec.Command, " ")
	case p.TCPSocket != nil:
		handler = fmt.Sprintf("tcp-socket %s:%s", p.TCPSocket.Host, p.TCPSocket.Port.String())
	case p.GRPC != nil:
		handler = fmt.Sprintf("grpc :%d", p.GRPC.Port)
	default:
		handler = "unknown"
	}
	return fmt.Sprintf("%s delay=%ds timeout=%ds period=%ds #success=%d #failure=%d",
		handler, p.InitialDelaySeconds, p.TimeoutSeconds, p.PeriodSeconds,
		p.SuccessThreshold, p.FailureThreshold)
}

func containerStatusMessage(state string, ready bool, terminated *corev1.ContainerStateTerminated) string {
	msg := state
	if ready {
		msg += ", ready"
	}
	if terminated != nil {
		msg += fmt.Sprintf(" - %s (exit code: %d)", terminated.Reason, terminated.ExitCode)
	}
	return msg
}

func buildContainerDetails(containers []corev1.Container, statuses []corev1.ContainerStatus) []dto.PodContainerDetail {
	csMap := make(map[string]corev1.ContainerStatus, len(statuses))
	for _, cs := range statuses {
		csMap[cs.Name] = cs
	}
	out := make([]dto.PodContainerDetail, 0, len(containers))
	for _, c := range containers {
		cs := csMap[c.Name]

		stateStr := "unknown"
		switch {
		case cs.State.Running != nil:
			stateStr = "running"
		case cs.State.Waiting != nil:
			stateStr = "waiting"
		case cs.State.Terminated != nil:
			stateStr = "terminated"
		}

		containerID := cs.ContainerID

		var reason, startedAt, finishedAt string
		var exitCode *int32

		switch {
		case cs.State.Running != nil:
			if !cs.State.Running.StartedAt.IsZero() {
				startedAt = cs.State.Running.StartedAt.Format(time.RFC3339)
			}
		case cs.State.Waiting != nil:
			reason = cs.State.Waiting.Reason
		case cs.State.Terminated != nil:
			t := cs.State.Terminated
			reason = t.Reason
			ec := t.ExitCode
			exitCode = &ec
			if !t.StartedAt.IsZero() {
				startedAt = t.StartedAt.Format(time.RFC3339)
			}
			if !t.FinishedAt.IsZero() {
				finishedAt = t.FinishedAt.Format(time.RFC3339)
			}
		}

		var lastStatus *dto.PodContainerLastStatus
		if t := cs.LastTerminationState.Terminated; t != nil {
			ls := &dto.PodContainerLastStatus{
				Reason:   t.Reason,
				ExitCode: t.ExitCode,
			}
			if !t.StartedAt.IsZero() {
				ls.Started = t.StartedAt.Format(time.RFC3339)
			}
			if !t.FinishedAt.IsZero() {
				ls.Finished = t.FinishedAt.Format(time.RFC3339)
			}
			lastStatus = ls
		}

		ports := make([]dto.PodContainerPort, 0, len(c.Ports))
		for _, p := range c.Ports {
			ports = append(ports, dto.PodContainerPort{
				Name: p.Name, HostIP: p.HostIP,
				HostPort: p.HostPort, ContainerPort: p.ContainerPort,
				Protocol: string(p.Protocol),
			})
		}

		envVars := make([]string, 0, len(c.Env))
		for _, e := range c.Env {
			if e.ValueFrom != nil {
				envVars = append(envVars, e.Name+"=<ref>")
			} else {
				envVars = append(envVars, e.Name+"="+e.Value)
			}
		}

		mounts := make([]dto.PodContainerMount, 0, len(c.VolumeMounts))
		for _, m := range c.VolumeMounts {
			mounts = append(mounts, dto.PodContainerMount{Path: m.MountPath, Name: m.Name, ReadOnly: m.ReadOnly})
		}

		cpuReqStr, cpuLimStr, memReqStr, memLimStr, diskReqStr, diskLimStr := "", "", "", "", "", ""
		if q, ok := c.Resources.Requests[corev1.ResourceCPU]; ok {
			cpuReqStr = formatCPUMilli(q.MilliValue())
		}
		if q, ok := c.Resources.Limits[corev1.ResourceCPU]; ok {
			cpuLimStr = formatCPUMilli(q.MilliValue())
		}
		if q, ok := c.Resources.Requests[corev1.ResourceMemory]; ok {
			memReqStr = formatMemBytes(q.Value())
		}
		if q, ok := c.Resources.Limits[corev1.ResourceMemory]; ok {
			memLimStr = formatMemBytes(q.Value())
		}
		if q, ok := c.Resources.Requests[corev1.ResourceEphemeralStorage]; ok {
			diskReqStr = formatMemBytes(q.Value())
		}
		if q, ok := c.Resources.Limits[corev1.ResourceEphemeralStorage]; ok {
			diskLimStr = formatMemBytes(q.Value())
		}

		args := make([]string, 0)
		if c.Args != nil {
			args = c.Args
		}

		out = append(out, dto.PodContainerDetail{
			Name: c.Name, Status: stateStr, Image: c.Image,
			Ready: cs.Ready, RestartCount: cs.RestartCount,
			LastStatus: lastStatus,
			Ports:      ports, EnvVars: envVars, Mounts: mounts,
			Liveness:  probeString(c.LivenessProbe),
			Readiness: probeString(c.ReadinessProbe),
			Startup:   probeString(c.StartupProbe),
			Command: func() []string {
				if c.Command == nil {
					return []string{}
				}
				return c.Command
			}(),
			Args:          args,
			StatusMessage: containerStatusMessage(stateStr, cs.Ready, cs.State.Terminated),
			CPURequest:    cpuReqStr, CPULimit: cpuLimStr,
			MemRequest: memReqStr, MemLimit: memLimStr,
			DiskRequest: diskReqStr, DiskLimit: diskLimStr,
			ContainerID: containerID, Reason: reason, ExitCode: exitCode, StartedAt: startedAt, FinishedAt: finishedAt,
		})
	}
	return out
}

// toPod converts a Pod to its DTO. When detail is false (list views), the
// Affinities YAML and ManagedFields YAML conversions are skipped — both are
// expensive (full YAML marshaling per pod) and only ever rendered in the
// detail drawer, so computing them for every pod in a cluster-wide list/emit
// is wasted work that scales with cluster size.
func toPod(pod *corev1.Pod, detail bool) dto.Pod {
	status := string(pod.Status.Phase)
	if pod.DeletionTimestamp != nil {
		status = "Terminating"
	}

	total := len(pod.Status.ContainerStatuses)
	readyCount := 0
	var restarts int32
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.Ready {
			readyCount++
		}
		restarts += cs.RestartCount
	}

	controlledBy := ""
	if len(pod.OwnerReferences) > 0 {
		controlledBy = pod.OwnerReferences[0].Kind
	}

	var cpuReq, cpuLim, memReq, memLim, diskReq, diskLim int64
	for _, c := range pod.Spec.Containers {
		if q, ok := c.Resources.Requests[corev1.ResourceCPU]; ok {
			cpuReq += q.MilliValue()
		}
		if q, ok := c.Resources.Limits[corev1.ResourceCPU]; ok {
			cpuLim += q.MilliValue()
		}
		if q, ok := c.Resources.Requests[corev1.ResourceMemory]; ok {
			memReq += q.Value()
		}
		if q, ok := c.Resources.Limits[corev1.ResourceMemory]; ok {
			memLim += q.Value()
		}
		if q, ok := c.Resources.Requests[corev1.ResourceEphemeralStorage]; ok {
			diskReq += q.Value()
		}
		if q, ok := c.Resources.Limits[corev1.ResourceEphemeralStorage]; ok {
			diskLim += q.Value()
		}
	}

	return dto.Pod{
		Name:         pod.Name,
		Namespace:    pod.Namespace,
		Status:       status,
		Ready:        fmt.Sprintf("%d/%d", readyCount, total),
		Containers:   int32(len(pod.Spec.Containers)),
		Restarts:     restarts,
		ControlledBy: controlledBy,
		NodeName:     pod.Spec.NodeName,
		QoS:          string(pod.Status.QOSClass),
		Age:          humanAge(pod.CreationTimestamp.Time),
		CPU:          resourceLabel(0, cpuReq, cpuLim, formatCPUMilli),
		Memory:       resourceLabel(0, memReq, memLim, formatMemBytes),
		Disk:         fmt.Sprintf("%s / %s", formatMemBytes(diskReq), formatMemBytes(diskLim)),
		CPUPercent:   0,
		MemPercent:   0,
		DiskPercent:  0,
		CPUReqMilli:  cpuReq,
		CPULimMilli:  cpuLim,
		MemReqBytes:  memReq,
		MemLimBytes:  memLim,
		DiskReqBytes: diskReq,
		DiskLimBytes: diskLim,

		CreatedAt:      pod.CreationTimestamp.Format(time.RFC3339),
		ServiceAccount: pod.Spec.ServiceAccountName,
		PriorityClass:  pod.Spec.PriorityClassName,
		TerminationGracePeriod: func() string {
			if pod.Spec.TerminationGracePeriodSeconds != nil {
				return fmt.Sprintf("%ds", *pod.Spec.TerminationGracePeriodSeconds)
			}
			return ""
		}(),
		ControlledByName: func() string {
			if len(pod.OwnerReferences) > 0 {
				return pod.OwnerReferences[0].Name
			}
			return ""
		}(),
		HostIPs: func() []string {
			if len(pod.Status.HostIPs) > 0 {
				out := make([]string, len(pod.Status.HostIPs))
				for i, h := range pod.Status.HostIPs {
					out[i] = h.IP
				}
				return out
			}
			if pod.Status.HostIP != "" {
				return []string{pod.Status.HostIP}
			}
			return nil
		}(),
		PodIPs: func() []string {
			if len(pod.Status.PodIPs) > 0 {
				out := make([]string, len(pod.Status.PodIPs))
				for i, p := range pod.Status.PodIPs {
					out[i] = p.IP
				}
				return out
			}
			if pod.Status.PodIP != "" {
				return []string{pod.Status.PodIP}
			}
			return nil
		}(),
		Tolerations: len(pod.Spec.Tolerations),
		TolerationDetails: func() []dto.TolerationDetail {
			out := make([]dto.TolerationDetail, 0, len(pod.Spec.Tolerations))
			for _, t := range pod.Spec.Tolerations {
				out = append(out, dto.TolerationDetail{
					Key:      t.Key,
					Operator: string(t.Operator),
					Value:    t.Value,
					Effect:   string(t.Effect),
					Seconds:  t.TolerationSeconds,
				})
			}
			return out
		}(),
		AffinityCount: func() int {
			if pod.Spec.Affinity == nil {
				return 0
			}
			n := 0
			if pod.Spec.Affinity.NodeAffinity != nil {
				n++
			}
			if pod.Spec.Affinity.PodAffinity != nil {
				n++
			}
			if pod.Spec.Affinity.PodAntiAffinity != nil {
				n++
			}
			return n
		}(),
		Affinities: func() string {
			if !detail || pod.Spec.Affinity == nil {
				return ""
			}
			b, err := sigsyaml.Marshal(pod.Spec.Affinity)
			if err != nil {
				return ""
			}
			return strings.TrimSpace(string(b))
		}(),
		Labels: func() map[string]string {
			if pod.Labels == nil {
				return map[string]string{}
			}
			return pod.Labels
		}(),
		Annotations: func() map[string]string {
			if pod.Annotations == nil {
				return map[string]string{}
			}
			return pod.Annotations
		}(),
		ManagedFields: func() []dto.ManagedField {
			if !detail {
				return nil
			}
			return toManagedFields(pod)
		}(),
		Conditions: func() []dto.PodCondition {
			out := make([]dto.PodCondition, 0, len(pod.Status.Conditions))
			for _, c := range pod.Status.Conditions {
				lastProbeTime := ""
				if !c.LastProbeTime.IsZero() {
					lastProbeTime = c.LastProbeTime.Format(time.RFC3339)
				}
				lastTransitionTime := ""
				if !c.LastTransitionTime.IsZero() {
					lastTransitionTime = c.LastTransitionTime.Format(time.RFC3339)
				}
				out = append(out, dto.PodCondition{
					Type:               string(c.Type),
					Status:             string(c.Status),
					Message:            c.Message,
					Reason:             c.Reason,
					LastProbeTime:      lastProbeTime,
					LastTransitionTime: lastTransitionTime,
				})
			}
			return out
		}(),
		ContainerDetails:     buildContainerDetails(pod.Spec.Containers, pod.Status.ContainerStatuses),
		InitContainerDetails: buildContainerDetails(pod.Spec.InitContainers, pod.Status.InitContainerStatuses),
		Volumes: func() []dto.PodVolume {
			out := make([]dto.PodVolume, 0, len(pod.Spec.Volumes))
			for _, v := range pod.Spec.Volumes {
				kind, hostPath, checkBehavior, medium, defaultMode := "unknown", "", "", "", ""
				var sources []dto.PodVolumeSource
				vs := v.VolumeSource
				switch {
				case vs.HostPath != nil:
					kind = "hostPath"
					hostPath = vs.HostPath.Path
					if vs.HostPath.Type != nil {
						checkBehavior = string(*vs.HostPath.Type)
					}
				case vs.EmptyDir != nil:
					kind = "emptyDir"
					medium = string(vs.EmptyDir.Medium)
				case vs.ConfigMap != nil:
					kind = "configMap"
				case vs.Secret != nil:
					kind = "secret"
				case vs.PersistentVolumeClaim != nil:
					kind = "persistentVolumeClaim"
				case vs.Projected != nil:
					kind = "projected"
					if vs.Projected.DefaultMode != nil {
						defaultMode = fmt.Sprintf("0o%o", *vs.Projected.DefaultMode)
					}
					for _, src := range vs.Projected.Sources {
						switch {
						case src.ServiceAccountToken != nil:
							sat := src.ServiceAccountToken
							exp := ""
							if sat.ExpirationSeconds != nil {
								exp = fmt.Sprintf("%ds", *sat.ExpirationSeconds)
							}
							sources = append(sources, dto.PodVolumeSource{
								Type:       "ServiceAccountToken",
								Expiration: exp,
								Path:       sat.Path,
							})
						case src.ConfigMap != nil:
							cm := src.ConfigMap
							items := make([]string, 0, len(cm.Items))
							for _, it := range cm.Items {
								items = append(items, it.Key+"→"+it.Path)
							}
							sources = append(sources, dto.PodVolumeSource{
								Type:  "ConfigMap",
								Name:  cm.Name,
								Items: items,
							})
						case src.Secret != nil:
							sec := src.Secret
							items := make([]string, 0, len(sec.Items))
							for _, it := range sec.Items {
								items = append(items, it.Key+"→"+it.Path)
							}
							sources = append(sources, dto.PodVolumeSource{
								Type:  "Secret",
								Name:  sec.Name,
								Items: items,
							})
						case src.DownwardAPI != nil:
							fieldItems := make([]string, 0, len(src.DownwardAPI.Items))
							for _, it := range src.DownwardAPI.Items {
								if it.FieldRef != nil {
									fieldItems = append(fieldItems, it.FieldRef.FieldPath)
								} else if it.ResourceFieldRef != nil {
									fieldItems = append(fieldItems, it.ResourceFieldRef.Resource)
								}
							}
							sources = append(sources, dto.PodVolumeSource{
								Type:  "DownwardAPI",
								Items: fieldItems,
							})
						}
					}
				case vs.DownwardAPI != nil:
					kind = "downwardAPI"
				case vs.NFS != nil:
					kind = "nfs"
				}
				out = append(out, dto.PodVolume{
					Name:          v.Name,
					Kind:          kind,
					HostPath:      hostPath,
					CheckBehavior: checkBehavior,
					Medium:        medium,
					DefaultMode:   defaultMode,
					Sources:       sources,
				})
			}
			return out
		}(),
	}
}

func ApplyPodMetrics(pods []dto.Pod, usage map[string]dto.PodUsage) []dto.Pod {
	for i, p := range pods {
		u, ok := usage[p.Namespace+"/"+p.Name]
		if !ok {
			continue
		}
		pods[i].CPU = resourceLabel(u.CPUMilliCores, p.CPUReqMilli, p.CPULimMilli, formatCPUMilli)
		pods[i].Memory = resourceLabel(u.MemoryBytes, p.MemReqBytes, p.MemLimBytes, formatMemBytes)
		pods[i].CPUPercent = resourcePercent(u.CPUMilliCores, p.CPULimMilli, p.CPUReqMilli)
		pods[i].MemPercent = resourcePercent(u.MemoryBytes, p.MemLimBytes, p.MemReqBytes)
	}
	return pods
}

func GetPodByName(lister listerscorev1.PodLister, namespace, name string) (dto.Pod, error) {
	pod, err := lister.Pods(namespace).Get(name)
	if err != nil {
		return dto.Pod{}, err
	}
	return toPod(pod, true), nil
}

func ListPods(lister listerscorev1.PodLister, namespaces []string) ([]dto.Pod, error) {
	var pods []*corev1.Pod
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		pods = all
	} else {
		for _, ns := range namespaces {
			nsPods, err := lister.Pods(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListPods: namespace %q: %v", ns, err)
				continue
			}
			pods = append(pods, nsPods...)
		}
	}
	result := make([]dto.Pod, len(pods))
	for i, p := range pods {
		result[i] = toPod(p, false)
	}
	return result, nil
}

func SummarizePods(pods []*corev1.Pod) dto.PodSummary {
	summary := dto.PodSummary{}
	for _, p := range pods {
		status := string(p.Status.Phase)
		if p.DeletionTimestamp != nil {
			status = "Terminating"
		}
		switch status {
		case "Running":
			summary.Running++
		case "Pending":
			summary.Pending++
		case "Failed":
			summary.Failed++
		case "Succeeded":
			summary.Succeeded++
		}
	}
	// Count evicted pods by checking for eviction reason in pod status
	for _, p := range pods {
		if p.Status.Reason == "Evicted" {
			summary.Evicted++
			// Subtract from other counts since Evicted is a special case
			status := string(p.Status.Phase)
			switch status {
			case "Running":
				summary.Running--
			case "Pending":
				summary.Pending--
			case "Failed":
				summary.Failed--
			case "Succeeded":
				summary.Succeeded--
			}
		}
	}
	return summary
}
