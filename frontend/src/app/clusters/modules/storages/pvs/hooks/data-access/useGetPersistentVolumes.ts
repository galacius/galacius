import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_PVS } from "../../api/api.const";
import type { PersistentVolume } from "../../api/resources";
import { ListPersistentVolumes } from "../../api/resources";
import { usePersistentVolumesUpdateEvents } from "../async-events/usePersistentVolumesUpdateEvents";

export const useGetPersistentVolumes = (
  context: string,
  callback?: UseQueryCallback<PersistentVolume[]>
) => {
  const latestPersistentVolumes = usePersistentVolumesUpdateEvents();

  const query = useQuery<PersistentVolume[], Error>({
    queryKey: [QUERY_KEY_PVS, context],
    queryFn: () => ListPersistentVolumes(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Merge event-driven data locally: prefer event persistent volumes over fetched data if available.
  const mergedData = useMemo(() => {
    let baseData = query.data;
    if (latestPersistentVolumes.length) baseData = latestPersistentVolumes;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestPersistentVolumes, query.data, callback]);

  return {
    ...query,
    data: mergedData,
  };
};
