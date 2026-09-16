import type { ManagedField } from "./shared";

export interface ReplicaSet {
  Name: string;
  Namespace: string;
  Desired: number;
  Current: number;
  Ready: number;
  Age: string;
  OwnerName: string;
  CreatedAt: string;
  OwnerKind: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  Selector: Record<string, string>;
  NodeSelector: Record<string, string>;
  Images: string[];
  ReplicasDetail: string;
  Tolerations: number;
  Affinities: number;
  PodStatus: string;
  HealthStatus: string;
  HealthMessage: string;
}

export interface ReplicaSetSummary {
  Running: number;
  Pending: number;
}
