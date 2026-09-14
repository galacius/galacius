import type { ManagedField } from "./shared";

export interface DaemonSet {
  Name: string;
  Namespace: string;
  Pods: string;
  NodeSelector: Record<string, string>;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  Selector: Record<string, string>;
  Images: string[];
  StrategyType: string;
  Tolerations: number;
  PodStatus: string;
}

export interface DaemonSetSummary {
  Running: number;
  Pending: number;
}
