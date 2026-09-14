import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_REPLICASET_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetReplicaSetYAML } from "../../api/resources";

export function useGetReplicaSetYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_REPLICASET_YAML, { context, namespace, name }],
    queryFn: () => GetReplicaSetYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
