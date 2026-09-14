import { useQuery } from "@tanstack/react-query";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_STATEFULSETS } from "../../api/api.const";
import type { StatefulSetSummary } from "../../api/resources";
import { GetStatefulSetsSummary } from "../../api/resources";

export const useGetStatefulSetsSummary = (input: { context: string; namespaces: string[] }) => {
  const { context, namespaces } = input;

  return useQuery<StatefulSetSummary, Error>({
    queryKey: [QUERY_KEY_STATEFULSETS, "summary", { context, namespaces }],
    queryFn: () => GetStatefulSetsSummary(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });
};
