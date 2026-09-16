import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_ENDPOINT_DETAIL } from "../../api/api.const";
import type { Endpoint } from "../../api/resources";
import { GetEndpointByName } from "../../api/resources";
import { useEndpointDetailUpdateEvents } from "../async-events/useEndpointDetailUpdateEvents";

export const useGetEndpointDetail = (context: string, namespace: string, name: string) => {
  // Scoped "endpoint:update" pushes for this one Endpoint — see useEndpointDetailUpdateEvents.
  const latestEndpoint = useEndpointDetailUpdateEvents(namespace, name);

  const query = useQuery<Endpoint, Error>({
    queryKey: [QUERY_KEY_ENDPOINT_DETAIL, { context, namespace, name }],
    queryFn: () => GetEndpointByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestEndpoint) return latestEndpoint;
    return query.data;
  }, [latestEndpoint, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
