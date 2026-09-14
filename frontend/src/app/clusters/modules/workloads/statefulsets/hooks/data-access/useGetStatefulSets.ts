import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_STATEFULSETS } from "../../api/api.const";
import type { StatefulSet } from "../../api/resources";
import { ListStatefulSets } from "../../api/resources";
import { useStatefulSetsUpdateEvents } from "../async-events/useStatefulSetsUpdateEvents";

export const useGetStatefulSets = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<StatefulSet[]>
) => {
  const { context, namespaces } = input;
  const latestStatefulSets = useStatefulSetsUpdateEvents();

  const query = useQuery<StatefulSet[], Error>({
    queryKey: [QUERY_KEY_STATEFULSETS, { context, namespaces }],
    queryFn: () => ListStatefulSets(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestStatefulSets.length ? latestStatefulSets : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestStatefulSets, query.data, callback]);

  const isLoading = latestStatefulSets.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
