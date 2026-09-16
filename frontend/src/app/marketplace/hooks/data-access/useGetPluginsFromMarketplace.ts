import { useQuery } from "@tanstack/react-query";
import { GetPluginsFromMarketplace } from "@wailsjs/go/app/App";
import type { dto } from "@wailsjs/go/models";
import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";

// Omit the generated class's `convertValues` instance method so plain object
// literals (e.g. test mocks) can satisfy this type structurally.
export type PluginManifest = Omit<dto.Manifest, "convertValues">;

export const QUERY_KEY_PLUGIN_MARKETPLACE = "plugin-marketplace";

export const useGetPluginsFromMarketplace = () => {
  return useQuery<PluginManifest[], Error>({
    queryKey: [QUERY_KEY_PLUGIN_MARKETPLACE],
    queryFn: async () => {
      const result = await GetPluginsFromMarketplace();

      if (!result) {
        throw new Error("Failed to fetch plugin marketplace: no response from backend");
      }

      const manifests = result.manifests ?? [];
      const errors = result.errors ?? {};

      if (manifests.length === 0 && Object.keys(errors).length > 0) {
        const errorMessages = Object.entries(errors)
          .map(([pluginId, msg]) => `${pluginId}: ${msg}`)
          .join("; ");
        throw new Error(`Failed to fetch plugin marketplace: ${errorMessages}`);
      }

      return manifests;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    ...DEFAULT_QUERY_OPTIONS,
  });
};
