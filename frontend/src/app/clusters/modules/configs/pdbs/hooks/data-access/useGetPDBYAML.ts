import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_PDB_YAML } from "../../api/api.const";
import { GetPDBYAML } from "../../api/resources";
import { useQuery } from "@tanstack/react-query";

export function useGetPDBYAML(context: string, namespace: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_PDB_YAML, { context, namespace, name }],
    queryFn: () => GetPDBYAML(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name && enabled,
  });
}
