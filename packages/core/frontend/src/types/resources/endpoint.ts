import type { ManagedField } from "./shared";

export interface EndpointAddress {
  IP: string;
  Hostname: string;
  TargetName: string;
}

export interface EndpointPort {
  Name: string;
  Port: number;
  Protocol: string;
}

export interface EndpointSubset {
  Addresses: EndpointAddress[];
  Ports: EndpointPort[];
}

export interface Endpoint {
  Name: string;
  Namespace: string;
  Endpoints: string;
  Age: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  Subsets: EndpointSubset[];
}
