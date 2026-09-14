import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_LIMIT_RANGE_DETAIL } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { LimitRangeDetail } from "../../api/resources";
import { GetLimitRangeByName } from "../../api/resources";
import { useLimitRangeUpdateEvents } from "../async-events/useLimitRangeUpdateEvents";

export const useGetLimitRangeDetail = (context: string, namespace: string, name: string) => {
  const latestLimitRange = useLimitRangeUpdateEvents(namespace, name);

  const query = useQuery<LimitRangeDetail, Error>({
    queryKey: [QUERY_KEY_LIMIT_RANGE_DETAIL, { context, namespace, name }],
    queryFn: () => GetLimitRangeByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestLimitRange) return latestLimitRange;
    return query.data;
  }, [latestLimitRange, query.data]);

  return { ...query, data: mergedData };
};
