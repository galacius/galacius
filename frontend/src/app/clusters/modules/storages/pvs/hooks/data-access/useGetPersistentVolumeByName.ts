import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_PERSISTENT_VOLUME_DETAIL } from "../../api/api.const";
import { GetPersistentVolumeByName, PersistentVolumeDetail } from "../../api/resources";
import { usePersistentVolumeUpdateEvents } from "../async-events/usePersistentVolumeUpdateEvents";

export function useGetPersistentVolumeByName(context: string, name: string) {
  const latestPV = usePersistentVolumeUpdateEvents(name);

  const query = useQuery<PersistentVolumeDetail>({
    queryKey: [QUERY_KEY_PERSISTENT_VOLUME_DETAIL, { context, name }],
    queryFn: async () => GetPersistentVolumeByName(name),
    enabled: !!context && !!name,
    ...DEFAULT_QUERY_OPTIONS,
  });

  const mergedData = useMemo(() => {
    if (latestPV) return latestPV;
    return query.data;
  }, [latestPV, query.data]);

  return { ...query, data: mergedData };
}
