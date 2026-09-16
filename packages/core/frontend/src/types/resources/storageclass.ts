import type { ManagedField } from "./shared";

export interface StorageClass {
  Name: string;
  Provisioner: string;
  ReclaimPolicy: string;
  Default: boolean;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  VolumeBindingMode: string;
  MountOptions: string[];
  Parameters: Record<string, string>;
}
