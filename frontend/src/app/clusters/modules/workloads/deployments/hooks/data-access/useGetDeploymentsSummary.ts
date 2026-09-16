import { useQuery } from "@tanstack/react-query";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_DEPLOYMENTS } from "../../api/api.const";
import type { DeploymentSummary } from "../../api/resources";
import { GetDeploymentsSummary } from "../../api/resources";

export const useGetDeploymentsSummary = (input: { context: string; namespaces: string[] }) => {
  const { context, namespaces } = input;

  return useQuery<DeploymentSummary, Error>({
    queryKey: [QUERY_KEY_DEPLOYMENTS, "summary", { context, namespaces }],
    queryFn: () => GetDeploymentsSummary(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });
};
