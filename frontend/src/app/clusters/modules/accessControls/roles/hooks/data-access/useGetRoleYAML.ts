import { useQuery } from "@tanstack/react-query";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_ROLE_YAML } from "../../api/api.const";
import { GetRoleYAML } from "../../api/resources";

export function useGetRoleYAML(context: string, namespace: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_ROLE_YAML, { context, namespace, name }],
    queryFn: () => GetRoleYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
