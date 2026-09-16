import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InstallPlugin } from "@wailsjs/go/app/App";
import { QUERY_KEY_PLUGIN_STATUS } from "../../../clusters/plugins/hooks/useGetInstalledPlugin";

interface InstallMutationVariables {
  pluginId: string;
  targetTag?: string;
  sourceUrl?: string;
}

/**
 * useMutateInstallPlugin triggers plugin installation via a mutation:
 * - Takes pluginId and targetTag as **call-time** arguments (not hook-time)
 * - This allows one hook instance to serve every row in a list
 * - Wraps InstallPlugin Wails binding and invalidates the same queries as useInstallPlugin.ts
 * - Callers can still catch errors and toast
 */
export const useMutateInstallPlugin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pluginId, targetTag, sourceUrl }: InstallMutationVariables) => {
      await InstallPlugin(pluginId, targetTag ?? "", sourceUrl ?? "");
    },
    onSuccess: async (_data, { pluginId }) => {
      // Invalidate status query to trigger immediate refetch
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_PLUGIN_STATUS, pluginId],
      });
      // Force NavSidebar plugin-discovery query to refetch immediately instead of waiting for 5s poll
      await queryClient.invalidateQueries({
        queryKey: ["plugin-statuses"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["installed-plugins"],
      });
    },
    onError: (error, { pluginId }) => {
      console.error(`Failed to install plugin ${pluginId}:`, error);
    },
  });
};
