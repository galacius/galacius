import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_ENDPOINTS } from "../../api/api.const";
import type { Endpoint } from "../../api/resources";
import { ListEndpoints } from "../../api/resources";
import { useEndpointsUpdateEvents } from "../async-events/useEndpointsUpdateEvents";

export const useGetEndpoints = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<Endpoint[]>
) => {
  const { context, namespaces } = input;
  const latestEndpoints = useEndpointsUpdateEvents();

  const query = useQuery<Endpoint[], Error>({
    queryKey: [QUERY_KEY_ENDPOINTS, { context, namespaces }],
    queryFn: () => ListEndpoints(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestEndpoints.length ? latestEndpoints : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestEndpoints, query.data, callback]);

  const isLoading = latestEndpoints.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
