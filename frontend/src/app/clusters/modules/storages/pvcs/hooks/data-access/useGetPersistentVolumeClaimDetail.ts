import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_PVC_DETAIL } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { PersistentVolumeClaimDetail } from "../../api/resources";
import { GetPersistentVolumeClaimByName } from "../../api/resources";
import { usePersistentVolumeClaimUpdateEvents } from "../async-events/usePersistentVolumeClaimUpdateEvents";

export const useGetPersistentVolumeClaimDetail = (
  context: string,
  namespace: string,
  name: string
) => {
  const latestPVC = usePersistentVolumeClaimUpdateEvents(namespace, name);

  const query = useQuery<PersistentVolumeClaimDetail, Error>({
    queryKey: [QUERY_KEY_PVC_DETAIL, { context, namespace, name }],
    queryFn: () => GetPersistentVolumeClaimByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestPVC) return latestPVC;
    return query.data;
  }, [latestPVC, query.data]);

  return { ...query, data: mergedData };
};
