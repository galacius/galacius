import { DEFAULT_QUERY_OPTIONS } from "../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { GetContextKubeconfigPath } from "@wailsjs/go/app/App";
import { QUERY_KEY_CONTEXT_KUBECONFIG_PATH } from "../../api/api.const";

export const useGetContextKubeconfigPath = (contextName: string | null) => {
  return useQuery<string, Error>({
    queryKey: [QUERY_KEY_CONTEXT_KUBECONFIG_PATH, { contextName }],
    queryFn: () => GetContextKubeconfigPath(contextName!),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!contextName,
  });
};
