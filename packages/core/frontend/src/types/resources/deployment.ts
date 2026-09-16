import type { ManagedField } from "./shared";
import type { TolerationDetail } from "./pod";

export interface DeploymentCondition {
  Type: string;
  Status: string;
  Message?: string;
  Reason?: string;
  LastTransitionTime?: string;
  LastUpdateTime?: string;
}

export interface Deployment {
  Name: string;
  Namespace: string;
  Pods: string;
  Replicas: number;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  ReplicasDetail: string;
  Selector: Record<string, string>;
  NodeSelector: Record<string, string>;
  StrategyType: string;
  MaxSurge: string;
  MaxUnavailable: string;
  Conditions: DeploymentCondition[];
  Tolerations: number;
  TolerationDetails: TolerationDetail[];
  AffinityCount: number;
  Affinities: string;
}

export interface DeploymentSummary {
  Running: number;
  Pending: number;
}
