import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_STORAGE_CLASSES } from "../../api/api.const";
import type { StorageClass } from "../../api/resources";
import { ListStorageClasses } from "../../api/resources";
import { useStorageClassesUpdateEvents } from "../async-events/useStorageClassesUpdateEvents";

export const useGetStorageClasses = (
  context: string,
  callback?: UseQueryCallback<StorageClass[]>
) => {
  const latestStorageClasses = useStorageClassesUpdateEvents();

  const query = useQuery<StorageClass[], Error>({
    queryKey: [QUERY_KEY_STORAGE_CLASSES, context],
    queryFn: () => ListStorageClasses(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Merge event-driven data locally: prefer event storage classes over fetched data if available.
  const mergedData = useMemo(() => {
    let baseData = query.data;
    if (latestStorageClasses.length) baseData = latestStorageClasses;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestStorageClasses, query.data, callback]);

  return {
    ...query,
    data: mergedData,
  };
};
