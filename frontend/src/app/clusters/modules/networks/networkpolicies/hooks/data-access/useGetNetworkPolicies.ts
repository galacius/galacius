import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_NETWORK_POLICIES } from "../../api/api.const";
import type { NetworkPolicy } from "../../api/resources";
import { ListNetworkPolicies } from "../../api/resources";
import { useNetworkPoliciesUpdateEvents } from "../async-events/useNetworkPoliciesUpdateEvents";

export const useGetNetworkPolicies = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<NetworkPolicy[]>
) => {
  const { context, namespaces } = input;
  const latestNetworkPolicies = useNetworkPoliciesUpdateEvents();

  const query = useQuery<NetworkPolicy[], Error>({
    queryKey: [QUERY_KEY_NETWORK_POLICIES, { context, namespaces }],
    queryFn: () => ListNetworkPolicies(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestNetworkPolicies.length ? latestNetworkPolicies : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestNetworkPolicies, query.data, callback]);

  const isLoading = latestNetworkPolicies.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
