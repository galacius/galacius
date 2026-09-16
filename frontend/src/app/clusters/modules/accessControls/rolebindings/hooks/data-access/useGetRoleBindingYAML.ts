import { useQuery } from "@tanstack/react-query";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_ROLE_BINDING_YAML } from "../../api/api.const";
import { GetRoleBindingYAML } from "../../api/resources";

export function useGetRoleBindingYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_ROLE_BINDING_YAML, { context, namespace, name }],
    queryFn: () => GetRoleBindingYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
