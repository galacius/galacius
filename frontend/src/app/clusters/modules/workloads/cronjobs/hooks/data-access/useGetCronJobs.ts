import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_CRONJOBS } from "../../api/api.const";
import type { CronJob } from "../../api/resources";
import { ListCronJobs } from "../../api/resources";
import { useCronJobsUpdateEvents } from "../async-events/useCronJobsUpdateEvents";

export const useGetCronJobs = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<CronJob[]>
) => {
  const { context, namespaces } = input;
  const latestCronJobs = useCronJobsUpdateEvents();

  const query = useQuery<CronJob[], Error>({
    queryKey: [QUERY_KEY_CRONJOBS, { context, namespaces }],
    queryFn: () => ListCronJobs(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestCronJobs.length ? latestCronJobs : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestCronJobs, query.data, callback]);

  const isLoading = latestCronJobs.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
