import type { ManagedField } from "./shared";

export interface NetworkPolicy {
  Name: string;
  Namespace: string;
  PolicyTypes: string;
  Age: string;
}

export interface NetworkPolicyDetail {
  Name: string;
  Namespace: string;
  CreatedAt: string;
  Labels: Record<string, string>;
  Annotations: Record<string, string>;
  ManagedFields: ManagedField[];
  PodSelector: Record<string, string>;
  IngressRules: NetworkPolicyIngressRule[];
  EgressRules: NetworkPolicyEgressRule[];
}

export interface NetworkPolicyIngressRule {
  Ports: string[];
  From: NetworkPolicyPeer[];
}

export interface NetworkPolicyEgressRule {
  Ports: string[];
  To: NetworkPolicyPeer[];
}

export interface NetworkPolicyPeer {
  PodSelector: Record<string, string>;
  NamespaceSelector: Record<string, string>;
  IPBlock: string;
}
