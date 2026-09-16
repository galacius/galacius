import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_NETWORK_POLICY_DETAIL } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { NetworkPolicyDetail } from "../../api/resources";
import { GetNetworkPolicyByName } from "../../api/resources";
import { useNetworkPolicyUpdateEvents } from "../async-events/useNetworkPolicyUpdateEvents";

export const useGetNetworkPolicyDetail = (context: string, namespace: string, name: string) => {
  const latestNetworkPolicy = useNetworkPolicyUpdateEvents(namespace, name);

  const query = useQuery<NetworkPolicyDetail, Error>({
    queryKey: [QUERY_KEY_NETWORK_POLICY_DETAIL, { context, namespace, name }],
    queryFn: () => GetNetworkPolicyByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestNetworkPolicy) return latestNetworkPolicy;
    return query.data;
  }, [latestNetworkPolicy, query.data]);

  return { ...query, data: mergedData };
};
