import type { ManagedField } from "./shared";

export interface Event {
  Type: string;
  Message: string;
  Namespace: string;
  InvolvedObjectKind: string;
  InvolvedObjectName: string;
  Source: string;
  Count: number;
  Age: string;
  LastSeen: string;
  CreatedAt: number;
  Name: string;
  Reason: string;
  FirstSeen: string;
  FirstSeenAt: number;
  LastSeenAt: number;
  InvolvedObjectFieldPath: string;
  InvolvedObjectNamespace: string;
  ManagedFields: ManagedField[];
}
