import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_CRONJOB_DETAIL } from "../../api/api.const";
import type { CronJob } from "../../api/resources";
import { GetCronJobByName } from "../../api/resources";
import { useCronJobDetailUpdateEvents } from "../async-events/useCronJobDetailUpdateEvents";

export const useGetCronJobDetail = (context: string, namespace: string, name: string) => {
  // Scoped "cronjob:update" pushes for this one CronJob — see useCronJobDetailUpdateEvents.
  const latestCronJob = useCronJobDetailUpdateEvents(namespace, name);

  const query = useQuery<CronJob, Error>({
    queryKey: [QUERY_KEY_CRONJOB_DETAIL, { context, namespace, name }],
    queryFn: () => GetCronJobByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestCronJob) return latestCronJob;
    return query.data;
  }, [latestCronJob, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
