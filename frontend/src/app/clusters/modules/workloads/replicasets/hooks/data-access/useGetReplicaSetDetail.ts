import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_REPLICASET_DETAIL } from "../../api/api.const";
import type { ReplicaSet } from "../../api/resources";
import { GetReplicaSetByName } from "../../api/resources";
import { useReplicaSetDetailUpdateEvents } from "../async-events/useReplicaSetDetailUpdateEvents";

export const useGetReplicaSetDetail = (context: string, namespace: string, name: string) => {
  // Scoped "replicaset:update" pushes for this one ReplicaSet — see useReplicaSetDetailUpdateEvents.
  const latestReplicaSet = useReplicaSetDetailUpdateEvents(namespace, name);

  const query = useQuery<ReplicaSet, Error>({
    queryKey: [QUERY_KEY_REPLICASET_DETAIL, { context, namespace, name }],
    queryFn: () => GetReplicaSetByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestReplicaSet) return latestReplicaSet;
    return query.data;
  }, [latestReplicaSet, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
