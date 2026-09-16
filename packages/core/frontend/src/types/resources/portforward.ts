export interface PortForward {
  ID: string;
  Name: string;
  Namespace: string;
  Kind: string;
  PodPort: string;
  TargetPort: string;
  ServicePort: string;
  LocalPort: string;
  Scheme: string;
  Protocol: string;
  Address: string;
  Status: string;
}
