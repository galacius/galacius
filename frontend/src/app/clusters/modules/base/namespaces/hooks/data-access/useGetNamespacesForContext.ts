import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { GetNamespacesForContext } from "@wailsjs/go/app/App";
import { QUERY_KEY_NAMESPACES_FOR_CONTEXT } from "../../../../../shared/api/api.const";

export const useGetNamespacesForContext = (contextName: string | null) => {
  return useQuery<string[], Error>({
    queryKey: [QUERY_KEY_NAMESPACES_FOR_CONTEXT, { contextName }],
    queryFn: () => GetNamespacesForContext(contextName!),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!contextName,
  });
};
