import { useQuery } from "@tanstack/react-query";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_REPLICASETS } from "../../api/api.const";
import type { ReplicaSetSummary } from "../../api/resources";
import { GetReplicaSetsSummary } from "../../api/resources";

export const useGetReplicaSetsSummary = (input: { context: string; namespaces: string[] }) => {
  const { context, namespaces } = input;

  return useQuery<ReplicaSetSummary, Error>({
    queryKey: [QUERY_KEY_REPLICASETS, "summary", { context, namespaces }],
    queryFn: () => GetReplicaSetsSummary(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });
};
