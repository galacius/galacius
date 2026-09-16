import type { ManagedField } from "./shared";

export interface PolicyRule {
  Resources: string[];
  Verbs: string[];
  APIGroups: string[];
  ResourceNames: string[];
  NonResourceURLs: string[];
}

export interface ClusterRole {
  Name: string;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  Rules: PolicyRule[];
}
