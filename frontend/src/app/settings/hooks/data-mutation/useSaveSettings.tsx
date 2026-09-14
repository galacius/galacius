import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SaveSettings } from "@wailsjs/go/app/App";
import { config } from "@wailsjs/go/models";
import { QUERY_KEY_PLUGIN_MARKETPLACE } from "../../../marketplace/hooks/data-access/useGetPluginsFromMarketplace";
import { QUERY_KEY_SETTINGS } from "../../api/api.const";

export const useSaveSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: config.Settings) => SaveSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SETTINGS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PLUGIN_MARKETPLACE] });
    },
  });
};
