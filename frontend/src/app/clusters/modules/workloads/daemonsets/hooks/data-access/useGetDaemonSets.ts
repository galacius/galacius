import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_DAEMONSETS } from "../../api/api.const";
import type { DaemonSet } from "../../api/resources";
import { ListDaemonSets } from "../../api/resources";
import { useDaemonSetsUpdateEvents } from "../async-events/useDaemonSetsUpdateEvents";

export const useGetDaemonSets = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<DaemonSet[]>
) => {
  const { context, namespaces } = input;
  const latestDaemonSets = useDaemonSetsUpdateEvents();

  const query = useQuery<DaemonSet[], Error>({
    queryKey: [QUERY_KEY_DAEMONSETS, { context, namespaces }],
    queryFn: () => ListDaemonSets(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestDaemonSets.length ? latestDaemonSets : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestDaemonSets, query.data, callback]);

  const isLoading = latestDaemonSets.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
