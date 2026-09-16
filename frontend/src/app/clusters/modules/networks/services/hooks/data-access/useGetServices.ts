import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_SERVICES } from "../../api/api.const";
import type { Service } from "../../api/resources";
import { ListServices } from "../../api/resources";
import { useServicesUpdateEvents } from "../async-events/useServicesUpdateEvents";

export const useGetServices = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<Service[]>
) => {
  const { context, namespaces } = input;
  const latestServices = useServicesUpdateEvents();

  const query = useQuery<Service[], Error>({
    queryKey: [QUERY_KEY_SERVICES, { context, namespaces }],
    queryFn: () => ListServices(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestServices.length ? latestServices : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestServices, query.data, callback]);

  const isLoading = latestServices.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
