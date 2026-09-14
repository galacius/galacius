import { DEFAULT_QUERY_OPTIONS } from "../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { GetClusterProxy } from "@wailsjs/go/app/App";
import { config } from "@wailsjs/go/models";
import { QUERY_KEY_CLUSTER_PROXY } from "../../api/api.const";

export const useGetClusterProxy = (contextName: string | null) => {
  return useQuery<config.ClusterProxy, Error>({
    queryKey: [QUERY_KEY_CLUSTER_PROXY, { contextName }],
    queryFn: () => GetClusterProxy(contextName!),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!contextName,
  });
};
