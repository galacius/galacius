import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_HPAS } from "../../api/api.const";
import type { HPA } from "../../api/resources";
import { ListHPAs } from "../../api/resources";
import { useHPAsUpdateEvents } from "../async-events/useHPAsUpdateEvents";

export const useGetHPAs = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<HPA[]>
) => {
  const { context, namespaces } = input;
  const latestHPAs = useHPAsUpdateEvents();

  const query = useQuery<HPA[], Error>({
    queryKey: [QUERY_KEY_HPAS, { context, namespaces }],
    queryFn: () => ListHPAs(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestHPAs.length ? latestHPAs : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestHPAs, query.data, callback]);

  const isLoading = latestHPAs.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
