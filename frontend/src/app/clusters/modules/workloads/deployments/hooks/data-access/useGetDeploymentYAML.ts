import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_DEPLOYMENT_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetDeploymentYAML } from "../../api/resources";

export function useGetDeploymentYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_DEPLOYMENT_YAML, { context, namespace, name }],
    queryFn: () => GetDeploymentYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
