import { useQuery } from "@tanstack/react-query";
import { GetInstalledPlugin } from "@wailsjs/go/app/App";
import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";
import { maskTerminalStatus } from "../../../shared/utils/maskTerminalStatus";

export interface PluginStatusResponse {
  status: "NOT_INSTALLED" | "INSTALLING" | "READY" | "CRASHED" | "INCOMPATIBLE";
  error?: string | null;
  progress?: number;
  bundleChecksum?: string;
  installedVersion?: string;
}

export const QUERY_KEY_PLUGIN_STATUS = "plugin-status";

export interface UseGetInstalledPluginOptions {
  /**
   * A CRASHED/INCOMPATIBLE status carried over from a previous session should not keep
   * presenting "Retry"/"Incompatible" forever — it's masked as NOT_INSTALLED until the
   * caller reports an install was attempted this mount (see useInstallPlugin's
   * hasAttemptedThisMount, reset on revisiting the page or app reload).
   */
  hasAttemptedInstall?: boolean;
}

/**
 * useGetInstalledPlugin polls GetInstalledPlugin(pluginId) every 5s while status is
 * INSTALLING and backs off once a terminal status is reached (READY/CRASHED/INCOMPATIBLE).
 */
export const useGetInstalledPlugin = (
  pluginId: string,
  { hasAttemptedInstall = false }: UseGetInstalledPluginOptions = {}
) => {
  const { data: statusData, isLoading } = useQuery<PluginStatusResponse, Error>({
    queryKey: [QUERY_KEY_PLUGIN_STATUS, pluginId],
    queryFn: async () => {
      const result = await GetInstalledPlugin(pluginId);
      return result as PluginStatusResponse;
    },
    // Only enable polling while status is INSTALLING or not yet fetched
    enabled: true,
    refetchInterval: (query) => {
      // Poll every 5s while INSTALLING, otherwise disable polling
      return query.state.data?.status === "INSTALLING" ? 5000 : false;
    },
    staleTime: 0, // Always refetch immediately
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    ...DEFAULT_QUERY_OPTIONS,
  });

  const rawStatus = statusData?.status || "NOT_INSTALLED";
  const status = maskTerminalStatus(rawStatus, hasAttemptedInstall);

  return {
    status,
    error: statusData?.error,
    progress: statusData?.progress ?? 0,
    bundleChecksum: statusData?.bundleChecksum,
    installedVersion: statusData?.installedVersion,
    isLoading,
  };
};
