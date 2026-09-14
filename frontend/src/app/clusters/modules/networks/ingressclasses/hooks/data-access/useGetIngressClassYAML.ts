import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_INGRESS_CLASS_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetIngressClassYAML } from "../../api/resources";

export function useGetIngressClassYAML(context: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_INGRESS_CLASS_YAML, { context, name }],
    queryFn: () => GetIngressClassYAML(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name && enabled,
  });
}
