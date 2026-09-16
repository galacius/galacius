import { LoadingSpinner } from "@galacius/design-system";
import { FC } from "react";
import { maskTerminalStatus } from "../../shared/utils/maskTerminalStatus";
import type { InstalledCatalogEntry } from "../hooks/usePluginCatalog";
import { PluginCard } from "./PluginCard";

// Backend placeholder for a plugin installed before checksum-tracking existed
// (or whose checksum file is otherwise missing) — never a real sha256, so it
// must not be treated as "matches the marketplace version".
const PLACEHOLDER_BUNDLE_CHECKSUM =
  "0000000000000000000000000000000000000000000000000000000000000000";

export const InstalledPluginsSection: FC<{
  installed: InstalledCatalogEntry[];
  isLoadingInstalled: boolean;
  hostVersion: string;
  hostPlatform: string | undefined;
  attemptedInstalls: Set<string>;
  removingIds: Set<string>;
  disablingIds: Set<string>;
  enablingIds: Set<string>;
  onInstall: (pluginId: string, pluginName: string) => void;
  onUpdate: (pluginId: string, pluginName: string) => void;
  onRetry: (pluginId: string, pluginName: string, targetTag?: string) => void;
  onRemove: (pluginId: string, pluginName: string) => void;
  onDisable: (pluginId: string, pluginName: string) => void;
  onEnable: (pluginId: string, pluginName: string) => void;
}> = ({
  installed,
  isLoadingInstalled,
  hostVersion,
  hostPlatform,
  attemptedInstalls,
  removingIds,
  disablingIds,
  enablingIds,
  onInstall,
  onUpdate,
  onRetry,
  onRemove,
  onDisable,
  onEnable,
}) => {
  if (isLoadingInstalled) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">Loading installed plugins...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-6">
      {installed.map(({ installedPlugin, manifest }) => {
        const hasAttempted = attemptedInstalls.has(installedPlugin.pluginId);
        const displayStatus = maskTerminalStatus(installedPlugin.status, hasAttempted);

        const hasComparableChecksum = Boolean(
          installedPlugin.bundleChecksum &&
          installedPlugin.bundleChecksum !== "" &&
          installedPlugin.bundleChecksum !== PLACEHOLDER_BUNDLE_CHECKSUM
        );
        const checksumMismatch =
          hasComparableChecksum && installedPlugin.bundleChecksum !== manifest.bundle.sha256;
        const versionMismatch = (installedPlugin.installedVersion ?? "") !== manifest.version;
        const updateAvailable: boolean =
          displayStatus === "READY" && (checksumMismatch || versionMismatch);

        const isPluginRemoving = removingIds.has(installedPlugin.pluginId);
        const isPluginDisabling = disablingIds.has(installedPlugin.pluginId);
        const isPluginEnabling = enablingIds.has(installedPlugin.pluginId);

        return (
          <PluginCard
            key={installedPlugin.pluginId}
            plugin={manifest}
            hostVersion={hostVersion}
            hostPlatform={hostPlatform}
            installStatus={
              displayStatus as
                "NOT_INSTALLED" | "INSTALLING" | "READY" | "CRASHED" | "INCOMPATIBLE" | "DISABLED"
            }
            installProgress={installedPlugin.progress}
            updateAvailable={updateAvailable}
            installedVersion={installedPlugin.installedVersion}
            installedSize={installedPlugin.size}
            isDisabling={isPluginDisabling}
            isEnabling={isPluginEnabling}
            onInstall={() => onInstall(installedPlugin.pluginId, manifest.name)}
            onUpdate={() => onUpdate(installedPlugin.pluginId, manifest.name)}
            onRetry={() =>
              onRetry(installedPlugin.pluginId, manifest.name, installedPlugin.installedVersion)
            }
            onRemove={() => onRemove(installedPlugin.pluginId, manifest.name)}
            onDisable={() => onDisable(installedPlugin.pluginId, manifest.name)}
            onEnable={() => onEnable(installedPlugin.pluginId, manifest.name)}
            isRemoving={isPluginRemoving}
          />
        );
      })}
    </div>
  );
};
