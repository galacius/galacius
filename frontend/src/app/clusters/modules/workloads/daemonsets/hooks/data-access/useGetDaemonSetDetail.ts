import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_DAEMONSET_DETAIL } from "../../api/api.const";
import type { DaemonSet } from "../../api/resources";
import { GetDaemonSetByName } from "../../api/resources";
import { useDaemonSetDetailUpdateEvents } from "../async-events/useDaemonSetDetailUpdateEvents";

export const useGetDaemonSetDetail = (context: string, namespace: string, name: string) => {
  // Scoped "daemonset:update" pushes for this one DaemonSet — see useDaemonSetDetailUpdateEvents.
  const latestDaemonSet = useDaemonSetDetailUpdateEvents(namespace, name);

  const query = useQuery<DaemonSet, Error>({
    queryKey: [QUERY_KEY_DAEMONSET_DETAIL, { context, namespace, name }],
    queryFn: () => GetDaemonSetByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestDaemonSet) return latestDaemonSet;
    return query.data;
  }, [latestDaemonSet, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
