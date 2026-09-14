import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_PDBS } from "../../api/api.const";
import type { PodDisruptionBudget } from "../../api/resources";
import { ListPodDisruptionBudgets } from "../../api/resources";
import { usePodDisruptionBudgetsUpdateEvents } from "../async-events/usePodDisruptionBudgetsUpdateEvents";

export const useGetPodDisruptionBudgets = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<PodDisruptionBudget[]>
) => {
  const { context, namespaces } = input;
  const latestPodDisruptionBudgets = usePodDisruptionBudgetsUpdateEvents();

  const query = useQuery<PodDisruptionBudget[], Error>({
    queryKey: [QUERY_KEY_PDBS, { context, namespaces }],
    queryFn: () => ListPodDisruptionBudgets(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestPodDisruptionBudgets.length ? latestPodDisruptionBudgets : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestPodDisruptionBudgets, query.data, callback]);

  const isLoading = latestPodDisruptionBudgets.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
