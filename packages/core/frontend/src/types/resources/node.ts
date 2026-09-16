import type { ManagedField } from "./shared";

export interface NodeAddress {
  Type: string;
  Address: string;
}

export interface NodeCondition {
  Type: string;
  Status: string;
  Reason: string;
  Message: string;
  LastHeartbeatTime: string;
  LastTransitionTime: string;
}

export interface Node {
  Name: string;
  Roles: string;
  Version: string;
  Age: string;
  Taints: number;
  Unschedulable: boolean;
  CPU: string;
  CPUPercent: number;
  Memory: string;
  MemPercent: number;
  Disk: string;
  DiskPercent: number;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  Addresses: NodeAddress[];
  OS: string;
  OSImage: string;
  KernelVersion: string;
  ContainerRuntime: string;
  Conditions: NodeCondition[];
  Capacity: Record<string, string>;
  Allocatable: Record<string, string>;
}
