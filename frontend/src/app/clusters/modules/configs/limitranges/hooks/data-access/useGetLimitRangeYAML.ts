import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_LIMITRANGE_YAML } from "../../api/api.const";
import { GetLimitRangeYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetLimitRangeYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_LIMITRANGE_YAML, { context, namespace, name }],
    queryFn: () => GetLimitRangeYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
