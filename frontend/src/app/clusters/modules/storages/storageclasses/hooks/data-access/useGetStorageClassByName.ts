import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_STORAGE_CLASS_DETAIL } from "../../api/api.const";
import type { StorageClass } from "../../api/resources";
import { GetStorageClassByName } from "../../api/resources";
import { useStorageClassesUpdateEvents } from "../async-events/useStorageClassesUpdateEvents";

export const useGetStorageClassByName = (context: string, name: string) => {
  const latestStorageClasses = useStorageClassesUpdateEvents();

  const query = useQuery<StorageClass, Error>({
    queryKey: [QUERY_KEY_STORAGE_CLASS_DETAIL, { context, name }],
    queryFn: () => GetStorageClassByName(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name,
  });

  // Merge event-driven data: prefer matched storage class from latest event if available.
  const mergedData = useMemo(() => {
    const matchedSc = latestStorageClasses.find((sc) => sc.Name === name);
    if (matchedSc) return matchedSc;
    return query.data;
  }, [latestStorageClasses, query.data, name]);

  return {
    ...query,
    data: mergedData,
  };
};
