import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_STORAGE_CLASS_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetStorageClassYAML } from "../../api/resources";

export function useGetStorageClassYAML(context: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_STORAGE_CLASS_YAML, { context, name }],
    queryFn: () => GetStorageClassYAML(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name && enabled,
  });
}
