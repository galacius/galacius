import type { ManagedField } from "./shared";
import type { PolicyRule } from "./clusterrole";

export interface Role {
  Name: string;
  Namespace: string;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  Rules: PolicyRule[];
}
