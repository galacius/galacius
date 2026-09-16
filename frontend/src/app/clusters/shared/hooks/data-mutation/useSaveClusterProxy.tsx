import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SaveClusterProxy } from "@wailsjs/go/app/App";
import { config } from "@wailsjs/go/models";
import { QUERY_KEY_CLUSTER_PROXY } from "../../api/api.const";

export const useSaveClusterProxy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contextName, proxy }: { contextName: string; proxy: config.ClusterProxy }) =>
      SaveClusterProxy(contextName, proxy),
    onSuccess: (_, { contextName }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_PROXY, { contextName }] });
    },
  });
};
