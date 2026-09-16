import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_DAEMONSET_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetDaemonSetYAML } from "../../api/resources";

export function useGetDaemonSetYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_DAEMONSET_YAML, { context, namespace, name }],
    queryFn: () => GetDaemonSetYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
