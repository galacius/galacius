import { ComponentType } from "react";

// Add new resource kinds here as more resources gain a modification tray.
export type ModificationResourceKind =
  | "ClusterRole"
  | "ClusterRoleBinding"
  | "ConfigMap"
  | "CronJob"
  | "DaemonSet"
  | "Deployment"
  | "Endpoint"
  | "EndpointSlice"
  | "HPA"
  | "Ingress"
  | "IngressClass"
  | "Job"
  | "Lease"
  | "LimitRange"
  | "Namespace"
  | "NetworkPolicy"
  | "Node"
  | "PersistentVolume"
  | "PersistentVolumeClaim"
  | "Pod"
  | "PodDisruptionBudget"
  | "PriorityClass"
  | "ReplicaSet"
  | "ResourceQuota"
  | "Role"
  | "RoleBinding"
  | "Secret"
  | "Service"
  | "ServiceAccount"
  | "StatefulSet"
  | "StorageClass"
  | "ValidatingWebhookConfig";

export interface ModificationTrayTab {
  id: string;
  kind: ModificationResourceKind;
  name: string;
  // Omit for cluster-scoped resources.
  namespace?: string;
}

export interface ModificationTrayContentProps {
  tab: ModificationTrayTab;
  collapsed: boolean;
  onClose: () => void;
}

export type ModificationTrayContentComponent = ComponentType<ModificationTrayContentProps>;
