import type { ManagedField } from "./shared";

export interface StatefulSet {
  Name: string;
  Namespace: string;
  Pods: string;
  Replicas: number;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  Selector: Record<string, string>;
  Images: string[];
  Affinities: number;
  PodStatus: string;
  HealthStatus: string;
  HealthMessage: string;
}

export interface StatefulSetSummary {
  Running: number;
  Pending: number;
}
