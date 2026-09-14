import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_INGRESSES } from "../../api/api.const";
import type { Ingress } from "../../api/resources";
import { ListIngresses } from "../../api/resources";
import { useIngressesUpdateEvents } from "../async-events/useIngressesUpdateEvents";

export const useGetIngresses = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<Ingress[]>
) => {
  const { context, namespaces } = input;
  const latestIngresses = useIngressesUpdateEvents();

  const query = useQuery<Ingress[], Error>({
    queryKey: [QUERY_KEY_INGRESSES, { context, namespaces }],
    queryFn: () => ListIngresses(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestIngresses.length ? latestIngresses : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestIngresses, query.data, callback]);

  const isLoading = latestIngresses.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
