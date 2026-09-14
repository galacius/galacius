import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_PVCS } from "../../api/api.const";
import type { PersistentVolumeClaim } from "../../api/resources";
import { ListPersistentVolumeClaims } from "../../api/resources";
import { usePersistentVolumeClaimsUpdateEvents } from "../async-events/usePersistentVolumeClaimsUpdateEvents";

export const useGetPersistentVolumeClaims = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<PersistentVolumeClaim[]>
) => {
  const { context, namespaces } = input;
  const latestPersistentVolumeClaims = usePersistentVolumeClaimsUpdateEvents();

  const query = useQuery<PersistentVolumeClaim[], Error>({
    queryKey: [QUERY_KEY_PVCS, { context, namespaces }],
    queryFn: () => ListPersistentVolumeClaims(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestPersistentVolumeClaims.length
      ? latestPersistentVolumeClaims
      : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestPersistentVolumeClaims, query.data, callback]);

  const isLoading = latestPersistentVolumeClaims.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
