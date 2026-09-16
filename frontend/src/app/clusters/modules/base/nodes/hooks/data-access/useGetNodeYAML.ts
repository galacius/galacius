import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_NODE_YAML } from "../../api/api.const";
import { GetNodeYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetNodeYAML(context: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_NODE_YAML, { context, name }],
    queryFn: () => GetNodeYAML(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name && enabled,
  });
}
