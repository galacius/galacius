import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_ENDPOINT_SLICE_DETAIL } from "../../api/api.const";
import type { EndpointSlice } from "../../api/resources";
import { GetEndpointSliceByName } from "../../api/resources";
import { useEndpointSlicesUpdateEvents } from "../async-events/useEndpointSlicesUpdateEvents";

export const useGetEndpointSliceByName = (context: string, namespace: string, name: string) => {
  const latestEndpointSlices = useEndpointSlicesUpdateEvents();

  const query = useQuery<EndpointSlice, Error>({
    queryKey: [QUERY_KEY_ENDPOINT_SLICE_DETAIL, { context, namespace, name }],
    queryFn: () => GetEndpointSliceByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  // Merge event-driven data: prefer matched endpoint slice from latest event if available.
  const mergedData = useMemo(() => {
    const matchedEndpointSlice = latestEndpointSlices.find(
      (eps) => eps.Namespace === namespace && eps.Name === name
    );
    if (matchedEndpointSlice) return matchedEndpointSlice;
    return query.data;
  }, [latestEndpointSlices, query.data, namespace, name]);

  return {
    ...query,
    data: mergedData,
  };
};
