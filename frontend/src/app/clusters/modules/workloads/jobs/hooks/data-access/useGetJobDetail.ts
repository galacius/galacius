import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_JOB_DETAIL } from "../../api/api.const";
import type { Job } from "../../api/resources";
import { GetJobByName } from "../../api/resources";
import { useJobDetailUpdateEvents } from "../async-events/useJobDetailUpdateEvents";

export const useGetJobDetail = (context: string, namespace: string, name: string) => {
  // Scoped "job:update" pushes for this one Job — see useJobDetailUpdateEvents.
  const latestJob = useJobDetailUpdateEvents(namespace, name);

  const query = useQuery<Job, Error>({
    queryKey: [QUERY_KEY_JOB_DETAIL, { context, namespace, name }],
    queryFn: () => GetJobByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestJob) return latestJob;
    return query.data;
  }, [latestJob, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
