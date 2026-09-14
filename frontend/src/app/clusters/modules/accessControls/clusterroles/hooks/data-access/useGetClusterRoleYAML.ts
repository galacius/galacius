import { useQuery } from "@tanstack/react-query";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_CLUSTER_ROLE_YAML } from "../../api/api.const";
import { GetClusterRoleYAML } from "../../api/resources";

export function useGetClusterRoleYAML(context: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_CLUSTER_ROLE_YAML, { context, name }],
    queryFn: () => GetClusterRoleYAML(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name && enabled,
  });
}
