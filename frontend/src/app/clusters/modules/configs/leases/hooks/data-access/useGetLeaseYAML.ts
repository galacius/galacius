import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_LEASE_YAML } from "../../api/api.const";
import { GetLeaseYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetLeaseYAML(context: string, namespace: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_LEASE_YAML, { context, namespace, name }],
    queryFn: () => GetLeaseYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
