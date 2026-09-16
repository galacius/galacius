import type { ManagedField } from "./shared";

export interface CRBSubject {
  Kind: string;
  Name: string;
  Namespace: string;
}

export interface ClusterRoleBinding {
  Name: string;
  Bindings: string;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  RoleRefKind: string;
  RoleRefName: string;
  RoleRefGroup: string;
  Subjects: CRBSubject[];
}
