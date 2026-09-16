import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_SERVICE_YAML } from "../../api/api.const";
import { GetServiceYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetServiceYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_SERVICE_YAML, { context, namespace, name }],
    queryFn: () => GetServiceYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
