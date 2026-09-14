import type { ManagedField } from "./shared";

export interface PriorityClass {
  Name: string;
  Value: number;
  GlobalDefault: boolean;
  Description: string;
  PreemptionPolicy: string;
  Age: string;
  CreatedAt: string;
  ManagedFields: ManagedField[];
}
