import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { GetActiveKubeconfigPaths } from "@wailsjs/go/app/App";
import { QUERY_KEY_ACTIVE_KUBECONFIG_PATHS } from "../../api/api.const";
import type { UseQueryCallback } from "@galacius/core";

export const useGetActiveKubeconfigPaths = (callback?: UseQueryCallback<string[]>) => {
  return useQuery<string[], Error>({
    queryKey: [QUERY_KEY_ACTIVE_KUBECONFIG_PATHS],
    queryFn: () => GetActiveKubeconfigPaths(),
    ...DEFAULT_QUERY_OPTIONS,
    select: callback?.select,
  });
};
