import type { ManagedField } from "./shared";

export interface PodCondition {
  Type: string;
  Status: string;
  Message: string;
  Reason: string;
  LastProbeTime: string;
  LastTransitionTime: string;
}
export interface PodContainerPort {
  Name: string;
  HostIP: string;
  HostPort: number;
  ContainerPort: number;
  Protocol: string;
}
export interface PodContainerMount {
  Path: string;
  Name: string;
  ReadOnly: boolean;
}
export interface PodContainerLastStatus {
  Reason: string;
  ExitCode: number;
  Started: string;
  Finished: string;
}
export interface PodContainerDetail {
  Name: string;
  Status: string;
  Image: string;
  Ready: boolean;
  RestartCount: number;
  LastStatus?: PodContainerLastStatus | null;
  Ports: PodContainerPort[];
  EnvVars: string[];
  Mounts: PodContainerMount[];
  Liveness: string;
  Readiness: string;
  Startup: string;
  Command: string[];
  Args: string[];
  StatusMessage: string;
  CPURequest: string;
  CPULimit: string;
  MemRequest: string;
  MemLimit: string;
  DiskRequest: string;
  DiskLimit: string;
  ContainerID: string;
  Reason: string;
  ExitCode?: number | null;
  StartedAt: string;
  FinishedAt: string;
}
export interface PodVolumeSource {
  Type: string;
  Name: string;
  Items: string[];
  Expiration: string;
  Path: string;
}

export interface PodVolume {
  Name: string;
  Kind: string;
  HostPath: string;
  CheckBehavior: string;
  Medium: string;
  DefaultMode: string;
  Sources: PodVolumeSource[];
}

export interface TolerationDetail {
  Key: string;
  Operator: string;
  Value: string;
  Effect: string;
  Seconds?: number | null;
}

export interface Pod {
  Name: string;
  Namespace: string;
  Status: string;
  Ready: string;
  Containers: number;
  Restarts: number;
  ControlledBy: string;
  NodeName: string;
  QoS: string;
  Age: string;
  CPU: string;
  Memory: string;
  Disk: string;
  CPUPercent: number;
  MemPercent: number;
  DiskPercent: number;
  CreatedAt: string;
  ServiceAccount: string;
  PriorityClass: string;
  TerminationGracePeriod: string;
  ControlledByName: string;
  HostIPs: string[];
  PodIPs: string[];
  Tolerations: number;
  TolerationDetails: TolerationDetail[];
  AffinityCount: number;
  Affinities: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  Conditions: PodCondition[];
  ContainerDetails: PodContainerDetail[];
  InitContainerDetails: PodContainerDetail[];
  Volumes: PodVolume[];
}

export interface PodSummary {
  Running: number;
  Pending: number;
  Failed: number;
  Succeeded: number;
  Evicted: number;
}
