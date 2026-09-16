import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_RESOURCE_QUOTA_YAML } from "../../api/api.const";
import { GetResourceQuotaYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetResourceQuotaYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_RESOURCE_QUOTA_YAML, { context, namespace, name }],
    queryFn: () => GetResourceQuotaYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
