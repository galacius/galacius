import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_LIMIT_RANGES } from "../../api/api.const";
import type { LimitRange } from "../../api/resources";
import { ListLimitRanges } from "../../api/resources";
import { useLimitRangesUpdateEvents } from "../async-events/useLimitRangesUpdateEvents";

export const useGetLimitRanges = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<LimitRange[]>
) => {
  const { context, namespaces } = input;
  const latestLimitRanges = useLimitRangesUpdateEvents();

  const query = useQuery<LimitRange[], Error>({
    queryKey: [QUERY_KEY_LIMIT_RANGES, { context, namespaces }],
    queryFn: () => ListLimitRanges(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestLimitRanges.length ? latestLimitRanges : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestLimitRanges, query.data, callback]);

  const isLoading = latestLimitRanges.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
