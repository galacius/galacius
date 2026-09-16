import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_NAMESPACE_YAML } from "../../api/api.const";
import { GetNamespaceYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetNamespaceYAML(context: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_NAMESPACE_YAML, { context, name }],
    queryFn: () => GetNamespaceYAML(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name && enabled,
  });
}
