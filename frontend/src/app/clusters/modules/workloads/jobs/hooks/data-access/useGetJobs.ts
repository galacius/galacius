import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_JOBS } from "../../api/api.const";
import type { Job } from "../../api/resources";
import { ListJobs } from "../../api/resources";
import { useJobsUpdateEvents } from "../async-events/useJobsUpdateEvents";

export const useGetJobs = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<Job[]>
) => {
  const { context, namespaces } = input;
  const latestJobs = useJobsUpdateEvents();

  const query = useQuery<Job[], Error>({
    queryKey: [QUERY_KEY_JOBS, { context, namespaces }],
    queryFn: () => ListJobs(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestJobs.length ? latestJobs : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestJobs, query.data, callback]);

  const isLoading = latestJobs.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
