import { useQuery } from "@tanstack/react-query";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_CLUSTER_ROLE_BINDING_YAML } from "../../api/api.const";
import { GetClusterRoleBindingYAML } from "../../api/resources";

export function useGetClusterRoleBindingYAML(context: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDING_YAML, { context, name }],
    queryFn: () => GetClusterRoleBindingYAML(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name && enabled,
  });
}
