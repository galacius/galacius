import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_PERSISTENT_VOLUME_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetPersistentVolumeYAML } from "../../api/resources";

export function useGetPersistentVolumeYAML(context: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_PERSISTENT_VOLUME_YAML, { context, name }],
    queryFn: () => GetPersistentVolumeYAML(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name && enabled,
  });
}
