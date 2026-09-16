export {
  GetNetworkPolicyByName,
  GetNetworkPolicyYAML,
  ListNetworkPolicies,
  UnwatchNetworkPolicyDetail,
  UpdateNetworkPolicyYAML,
  WatchNetworkPolicyDetail,
} from "@wailsjs/go/app/App";

export type {
  NetworkPolicy,
  NetworkPolicyDetail,
  NetworkPolicyIngressRule,
  NetworkPolicyEgressRule,
  NetworkPolicyPeer,
} from "@galacius/core";
