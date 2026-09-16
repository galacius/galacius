import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_SECRET_YAML } from "../../api/api.const";
import { GetSecretYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetSecretYAML(context: string, namespace: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_SECRET_YAML, { context, namespace, name }],
    queryFn: () => GetSecretYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
