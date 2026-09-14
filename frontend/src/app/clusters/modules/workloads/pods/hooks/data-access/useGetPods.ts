import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_PODS } from "../../api/api.const";
import type { Pod } from "../../api/resources";
import { ListPods } from "../../api/resources";
import { usePodsUpdateEvents } from "../async-events/usePodsUpdateEvents";

export const useGetPods = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<Pod[]>
) => {
  const { context, namespaces } = input;
  const latestPods = usePodsUpdateEvents();

  const query = useQuery<Pod[], Error>({
    queryKey: [QUERY_KEY_PODS, { context, namespaces }],
    queryFn: () => ListPods(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestPods.length ? latestPods : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestPods, query.data, callback]);

  const isLoading = latestPods.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
