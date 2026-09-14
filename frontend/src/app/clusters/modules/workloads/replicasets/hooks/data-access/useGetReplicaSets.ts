import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_REPLICASETS } from "../../api/api.const";
import type { ReplicaSet } from "../../api/resources";
import { ListReplicaSets } from "../../api/resources";
import { useReplicaSetsUpdateEvents } from "../async-events/useReplicaSetsUpdateEvents";

export const useGetReplicaSets = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<ReplicaSet[]>
) => {
  const { context, namespaces } = input;
  const latestReplicaSets = useReplicaSetsUpdateEvents();

  const query = useQuery<ReplicaSet[], Error>({
    queryKey: [QUERY_KEY_REPLICASETS, { context, namespaces }],
    queryFn: () => ListReplicaSets(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestReplicaSets.length ? latestReplicaSets : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestReplicaSets, query.data, callback]);

  const isLoading = latestReplicaSets.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
