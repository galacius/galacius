import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_STATEFULSET_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetStatefulSetYAML } from "../../api/resources";

export function useGetStatefulSetYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_STATEFULSET_YAML, { context, namespace, name }],
    queryFn: () => GetStatefulSetYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
