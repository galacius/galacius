import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_SERVICE_DETAIL } from "../../api/api.const";
import type { Service } from "../../api/resources";
import { GetServiceByName } from "../../api/resources";
import { useServiceDetailUpdateEvents } from "../async-events/useServiceDetailUpdateEvents";

export const useGetServiceDetail = (context: string, namespace: string, name: string) => {
  // Scoped "service:update" pushes for this one Service — see useServiceDetailUpdateEvents.
  const latestService = useServiceDetailUpdateEvents(namespace, name);

  const query = useQuery<Service, Error>({
    queryKey: [QUERY_KEY_SERVICE_DETAIL, { context, namespace, name }],
    queryFn: () => GetServiceByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestService) return latestService;
    return query.data;
  }, [latestService, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
