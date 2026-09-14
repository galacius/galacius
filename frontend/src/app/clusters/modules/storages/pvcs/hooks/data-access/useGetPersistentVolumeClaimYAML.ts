import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_PERSISTENTVOLUMECLAIM_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetPersistentVolumeClaimYAML } from "../../api/resources";

export function useGetPersistentVolumeClaimYAML(
  context: string,
  namespace: string,
  name: string,
  enabled = true
) {
  return useQuery({
    queryKey: [QUERY_KEY_PERSISTENTVOLUMECLAIM_YAML, { context, namespace, name }],
    queryFn: () => GetPersistentVolumeClaimYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
