export interface PersistentVolume {
  Name: string;
  StorageClass: string;
  Capacity: string;
  Claim: string;
  Age: string;
  Status: string;
}

export interface PersistentVolumeDetail {
  Name: string;
  Capacity: string;
  AccessModes: string[];
  ReclaimPolicy: string;
  Status: string;
  StorageClass: string;
  Claim: string;
  VolumeMode: string;
  MountOptions: string[];
  NodeAffinitySummary: string;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
}
