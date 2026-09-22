import { Divider } from "@galacius/design-system";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useGetVersion } from "../updater/hooks/data-access/useGetVersion";
import { AvailablePluginsSection } from "./components/AvailablePluginsSection";
import { InstalledPluginsSection } from "./components/InstalledPluginsSection";
import {
  toastPluginDisableFailed,
  toastPluginEnableFailed,
  toastPluginInstallFailed,
  toastPluginInstallSucceeded,
  toastPluginRemovalFailed,
  toastPluginRemovalSucceeded,
} from "./components/PluginToasts";
import { useGetHostPlatform } from "./hooks/data-access/useGetHostPlatform";
import { useGetInstalledPlugins } from "./hooks/data-access/useGetInstalledPlugins";
import { useGetPluginsFromMarketplace } from "./hooks/data-access/useGetPluginsFromMarketplace";
import { useMutateDisablePlugin } from "./hooks/data-mutation/useMutateDisablePlugin";
import { useMutateEnablePlugin } from "./hooks/data-mutation/useMutateEnablePlugin";
import { useMutateInstallPlugin } from "./hooks/data-mutation/useMutateInstallPlugin";
import { useMutateRemovePlugin } from "./hooks/data-mutation/useMutateRemovePlugin";
import { usePluginCatalog } from "./hooks/usePluginCatalog";

export const MarketplaceView: FC<{
  onGoToMarketplaceSettings?: () => void;
}> = ({ onGoToMarketplaceSettings }) => {
  const {
    data: marketplacePlugins = [],
    isLoading: isLoadingMarketplace,
    isError: isMarketplaceError,
    error: marketplaceError,
  } = useGetPluginsFromMarketplace();

  // Get current app version for compatibility checking
  const { data: hostVersion = "0.1.0" } = useGetVersion();

  // Get current OS ("linux" | "darwin" | "windows") to highlight the matching compatibility chip
  const { data: hostPlatform } = useGetHostPlatform();

  // Fetch all installed plugins (plural) for joining with marketplace plugins
  const { pluginStatuses: installedPlugins = [], isLoading: isLoadingInstalled } =
    useGetInstalledPlugins();

  // Mutation hooks for install, remove, disable, and enable (call-time arguments, not hook-time)
  const installMutation = useMutateInstallPlugin();
  const removeMutation = useMutateRemovePlugin();
  const disableMutation = useMutateDisablePlugin();
  const enableMutation = useMutateEnablePlugin();

  // Track per-plugin "attempted install this mount" as a Set in state
  // Used to mask CRASHED/INCOMPATIBLE statuses as NOT_INSTALLED for display
  // (replaces the old single hasAttemptedThisMount boolean)
  const [attemptedInstalls, setAttemptedInstalls] = useState<Set<string>>(new Set());

  // Track per-plugin IDs currently being removed to fix the concurrency issue.
  // useMutation's .isPending and .variables are shared across all calls on the
  // same hook instance. This Set lets us track in-flight removes independently
  // per pluginId instead of relying on mutation.variables which gets overwritten.
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Track per-plugin IDs currently being disabled/enabled
  const [disablingIds, setDisablingIds] = useState<Set<string>>(new Set());
  const [enablingIds, setEnablingIds] = useState<Set<string>>(new Set());

  // Generic install handler called from card's onInstall/onUpdate callbacks
  const handleInstall = useCallback(
    async (pluginId: string, pluginName: string, targetTag?: string) => {
      setAttemptedInstalls((prev) => new Set(prev).add(pluginId));
      try {
        // Look up the manifest to get its sourceUrl
        const manifest = marketplacePlugins.find((p) => p.id === pluginId);
        const sourceUrl = manifest?.sourceUrl ?? "";
        await installMutation.mutateAsync({ pluginId, targetTag, sourceUrl });
      } catch (error) {
        console.error(`Failed to install ${pluginName} plugin:`, error);
        toastPluginInstallFailed(pluginName, error);
      }
    },
    [installMutation, marketplacePlugins]
  );

  // Generic remove handler called from card's onRemove callback
  const handleRemove = useCallback(
    async (pluginId: string, pluginName: string) => {
      setRemovingIds((prev) => new Set(prev).add(pluginId));
      try {
        await removeMutation.mutateAsync({ pluginId });
        toastPluginRemovalSucceeded(pluginName);
      } catch (error) {
        console.error(`Failed to remove ${pluginName} plugin:`, error);
        toastPluginRemovalFailed(pluginName, error);
      } finally {
        setRemovingIds((prev) => {
          const updated = new Set(prev);
          updated.delete(pluginId);
          return updated;
        });
      }
    },
    [removeMutation]
  );

  // Generic disable handler called from card's onDisable callback
  const handleDisable = useCallback(
    async (pluginId: string, pluginName: string) => {
      setDisablingIds((prev) => new Set(prev).add(pluginId));
      try {
        await disableMutation.mutateAsync({ pluginId });
      } catch (error) {
        console.error(`Failed to disable ${pluginName} plugin:`, error);
        toastPluginDisableFailed(pluginName, error);
      } finally {
        setDisablingIds((prev) => {
          const updated = new Set(prev);
          updated.delete(pluginId);
          return updated;
        });
      }
    },
    [disableMutation]
  );

  // Generic enable handler called from card's onEnable callback
  const handleEnable = useCallback(
    async (pluginId: string, pluginName: string) => {
      setEnablingIds((prev) => new Set(prev).add(pluginId));
      // A failed relaunch on enable reports CRASHED, same as a failed install.
      // Without marking this an "attempted" action, maskTerminalStatus would
      // treat that CRASHED as stale leftover state and hide the plugin as
      // NOT_INSTALLED — even though it's still fully installed on disk — which
      // moves it into "Available" and invites a redundant reinstall on top of
      // the still-registered loader.
      setAttemptedInstalls((prev) => new Set(prev).add(pluginId));
      try {
        await enableMutation.mutateAsync({ pluginId });
      } catch (error) {
        console.error(`Failed to enable ${pluginName} plugin:`, error);
        toastPluginEnableFailed(pluginName, error);
      } finally {
        setEnablingIds((prev) => {
          const updated = new Set(prev);
          updated.delete(pluginId);
          return updated;
        });
      }
    },
    [enableMutation]
  );

  // Track previous statuses per plugin ID for toast on install completion
  const previousStatusesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const marketplacePluginsById = new Map(marketplacePlugins.map((p) => [p.id, p]));

    for (const status of installedPlugins) {
      const previousStatus = previousStatusesRef.current[status.pluginId];
      previousStatusesRef.current[status.pluginId] = status.status;

      if (previousStatus !== "INSTALLING") continue;

      if (status.status === "READY") {
        // Find plugin name from marketplace for toast
        const plugin = marketplacePluginsById.get(status.pluginId);
        toastPluginInstallSucceeded(plugin?.name ?? status.pluginId);
      } else if (status.status === "CRASHED" || status.status === "INCOMPATIBLE") {
        const plugin = marketplacePluginsById.get(status.pluginId);
        toastPluginInstallFailed(plugin?.name ?? status.pluginId, status.error);
      }
    }
  }, [installedPlugins, marketplacePlugins]);

  const { installed, available } = usePluginCatalog(
    installedPlugins,
    attemptedInstalls,
    marketplacePlugins
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6 py-3">
        <h2 className="text-sm font-semibold">Marketplace</h2>
      </header>
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="flex min-h-full flex-col gap-4">
          {/* Installed Plugins Section — sourced from local disk state, unaffected by marketplace fetch errors */}
          {installed.length > 0 && (
            <>
              <section className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold">
                  Installed Plugins{installed.length > 0 ? ` (${installed.length})` : ""}
                </h3>
                <InstalledPluginsSection
                  installed={installed}
                  isLoadingInstalled={isLoadingInstalled}
                  hostVersion={hostVersion}
                  hostPlatform={hostPlatform}
                  attemptedInstalls={attemptedInstalls}
                  removingIds={removingIds}
                  disablingIds={disablingIds}
                  enablingIds={enablingIds}
                  onInstall={handleInstall}
                  onUpdate={handleInstall}
                  onRetry={handleInstall}
                  onRemove={handleRemove}
                  onDisable={handleDisable}
                  onEnable={handleEnable}
                />
              </section>

              <Divider />
            </>
          )}

          {/* Available Plugins Section — sourced from the marketplace fetch; errors here don't affect Installed */}
          <section className="flex flex-1 flex-col gap-4">
            <h3 className="text-sm font-semibold">
              Available Plugins{available.length > 0 ? ` (${available.length})` : ""}
            </h3>
            <AvailablePluginsSection
              isMarketplaceError={isMarketplaceError}
              marketplaceError={marketplaceError}
              onGoToMarketplaceSettings={onGoToMarketplaceSettings}
              isLoadingMarketplace={isLoadingMarketplace}
              available={available}
              hostVersion={hostVersion}
              hostPlatform={hostPlatform}
              removingIds={removingIds}
              onInstall={handleInstall}
              onRemove={handleRemove}
            />
          </section>
        </div>
      </div>
    </div>
  );
};
