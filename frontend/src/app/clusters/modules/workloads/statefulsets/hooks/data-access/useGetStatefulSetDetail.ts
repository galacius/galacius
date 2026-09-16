import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_STATEFULSET_DETAIL } from "../../api/api.const";
import type { StatefulSet } from "../../api/resources";
import { GetStatefulSetByName } from "../../api/resources";
import { useStatefulSetDetailUpdateEvents } from "../async-events/useStatefulSetDetailUpdateEvents";

export const useGetStatefulSetDetail = (context: string, namespace: string, name: string) => {
  // Scoped "statefulset:update" pushes for this one StatefulSet — see useStatefulSetDetailUpdateEvents.
  const latestStatefulSet = useStatefulSetDetailUpdateEvents(namespace, name);

  const query = useQuery<StatefulSet, Error>({
    queryKey: [QUERY_KEY_STATEFULSET_DETAIL, { context, namespace, name }],
    queryFn: () => GetStatefulSetByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestStatefulSet) return latestStatefulSet;
    return query.data;
  }, [latestStatefulSet, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
