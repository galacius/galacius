import { useQuery } from "@tanstack/react-query";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_JOBS } from "../../api/api.const";
import type { JobSummary } from "../../api/resources";
import { GetJobsSummary } from "../../api/resources";

export const useGetJobsSummary = (input: { context: string; namespaces: string[] }) => {
  const { context, namespaces } = input;

  return useQuery<JobSummary, Error>({
    queryKey: [QUERY_KEY_JOBS, "summary", { context, namespaces }],
    queryFn: () => GetJobsSummary(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });
};
