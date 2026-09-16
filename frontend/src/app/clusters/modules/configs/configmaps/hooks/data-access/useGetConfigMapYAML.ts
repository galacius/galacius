import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_CONFIGMAP_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetConfigMapYAML } from "../../api/resources";

export function useGetConfigMapYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_CONFIGMAP_YAML, { context, namespace, name }],
    queryFn: () => GetConfigMapYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
