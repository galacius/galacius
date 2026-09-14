import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_ENDPOINT_SLICES } from "../../api/api.const";
import type { EndpointSlice } from "../../api/resources";
import { ListEndpointSlices } from "../../api/resources";
import { useEndpointSlicesUpdateEvents } from "../async-events/useEndpointSlicesUpdateEvents";

export const useGetEndpointSlices = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<EndpointSlice[]>
) => {
  const { context, namespaces } = input;
  const latestEndpointSlices = useEndpointSlicesUpdateEvents();

  const query = useQuery<EndpointSlice[], Error>({
    queryKey: [QUERY_KEY_ENDPOINT_SLICES, { context, namespaces }],
    queryFn: () => ListEndpointSlices(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestEndpointSlices.length ? latestEndpointSlices : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestEndpointSlices, query.data, callback]);

  const isLoading = latestEndpointSlices.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
