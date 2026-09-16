import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { GetDefaultNamespaces } from "@wailsjs/go/app/App";
import { QUERY_KEY_DEFAULT_NAMESPACES } from "../../../../../shared/api/api.const";

export const useGetDefaultNamespaces = (contextName: string | null) => {
  return useQuery<string[], Error>({
    queryKey: [QUERY_KEY_DEFAULT_NAMESPACES, { contextName }],
    queryFn: () => GetDefaultNamespaces(contextName!),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!contextName,
  });
};
