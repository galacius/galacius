import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_ENDPOINT_YAML } from "../../api/api.const";
import { GetEndpointYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetEndpointYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_ENDPOINT_YAML, { context, namespace, name }],
    queryFn: () => GetEndpointYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
