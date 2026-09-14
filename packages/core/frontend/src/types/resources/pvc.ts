export interface PersistentVolumeClaim {
  Name: string;
  Namespace: string;
  StorageClass: string;
  Size: string;
  Pods: string;
  Age: string;
  Status: string;
}

export interface PersistentVolumeClaimDetail {
  Name: string;
  Namespace: string;
  StorageClass: string;
  Size: string;
  Pods: string[];
  Age: string;
  CreatedAt: string;
  Status: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  Finalizers: string[];
  AccessModes: string[];
  MatchLabels: Record<string, string>;
  MatchExprs: string[];
}
