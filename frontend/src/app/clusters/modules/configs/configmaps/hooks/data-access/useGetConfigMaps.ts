import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_CONFIGMAPS } from "../../api/api.const";
import type { ConfigMap } from "../../api/resources";
import { ListConfigMaps } from "../../api/resources";
import { useConfigMapsUpdateEvents } from "../async-events/useConfigMapsUpdateEvents";

export const useGetConfigMaps = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<ConfigMap[]>
) => {
  const { context, namespaces } = input;
  const latestConfigMaps = useConfigMapsUpdateEvents();

  const query = useQuery<ConfigMap[], Error>({
    queryKey: [QUERY_KEY_CONFIGMAPS, { context, namespaces }],
    queryFn: () => ListConfigMaps(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestConfigMaps.length ? latestConfigMaps : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestConfigMaps, query.data, callback]);

  const isLoading = latestConfigMaps.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
