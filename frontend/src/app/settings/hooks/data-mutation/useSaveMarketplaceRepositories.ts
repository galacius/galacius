import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SaveMarketplaceRepositories } from "@wailsjs/go/app/App";
import { config } from "@wailsjs/go/models";
import { QUERY_KEY_PLUGIN_MARKETPLACE } from "../../../marketplace/hooks/data-access/useGetPluginsFromMarketplace";
import { QUERY_KEY_SETTINGS } from "../../api/api.const";

export const useSaveMarketplaceRepositories = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repos: config.MarketplaceRepository[]) => SaveMarketplaceRepositories(repos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SETTINGS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PLUGIN_MARKETPLACE] });
    },
  });
};
