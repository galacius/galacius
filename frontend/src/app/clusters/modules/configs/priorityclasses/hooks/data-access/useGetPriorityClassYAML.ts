import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_PRIORITY_CLASS_YAML } from "../../api/api.const";
import { GetPriorityClassYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetPriorityClassYAML(context: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_PRIORITY_CLASS_YAML, { context, name }],
    queryFn: () => GetPriorityClassYAML(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name && enabled,
  });
}
