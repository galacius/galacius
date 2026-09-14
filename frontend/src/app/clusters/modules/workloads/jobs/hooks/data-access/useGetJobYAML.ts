import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_JOB_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetJobYAML } from "../../api/resources";

export function useGetJobYAML(context: string, namespace: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_JOB_YAML, { context, namespace, name }],
    queryFn: () => GetJobYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
