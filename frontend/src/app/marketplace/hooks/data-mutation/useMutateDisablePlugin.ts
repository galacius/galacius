import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DisablePlugin } from "@wailsjs/go/app/App";
import { QUERY_KEY_PLUGIN_STATUS } from "../../../clusters/plugins/hooks/useGetInstalledPlugin";

interface DisableMutationVariables {
  pluginId: string;
}

/**
 * useMutateDisablePlugin triggers plugin disable via a mutation:
 * - Takes pluginId as a **call-time** argument (not hook-time)
 * - This allows one hook instance to serve every row in a list
 * - Wraps DisablePlugin Wails binding and invalidates the same queries as related mutations
 * - Callers can still catch errors and toast
 */
export const useMutateDisablePlugin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pluginId }: DisableMutationVariables) => {
      await DisablePlugin(pluginId);
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
      console.error(`Failed to disable plugin ${pluginId}:`, error);
    },
  });
};
