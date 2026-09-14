import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_POD_DETAIL } from "../../api/api.const";
import type { Pod } from "../../api/resources";
import { GetPodByName } from "../../api/resources";
import { usePodDetailUpdateEvents } from "../async-events/usePodDetailUpdateEvents";

export const useGetPodDetail = (context: string, namespace: string, name: string) => {
  // Scoped "pod:update" pushes (detail=true) for this one pod — see
  // usePodDetailUpdateEvents. Unlike the "pods:update" list topic, this
  // never drops detail-only fields like ManagedFields.
  const latestPod = usePodDetailUpdateEvents(namespace, name);

  const query = useQuery<Pod, Error>({
    queryKey: [QUERY_KEY_POD_DETAIL, { context, namespace, name }],
    queryFn: () => GetPodByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestPod) return latestPod;
    return query.data;
  }, [latestPod, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
