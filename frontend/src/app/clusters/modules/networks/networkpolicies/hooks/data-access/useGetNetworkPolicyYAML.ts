import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_NETWORK_POLICY_YAML } from "../../api/api.const";
import { GetNetworkPolicyYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetNetworkPolicyYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_NETWORK_POLICY_YAML, { context, namespace, name }],
    queryFn: () => GetNetworkPolicyYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
