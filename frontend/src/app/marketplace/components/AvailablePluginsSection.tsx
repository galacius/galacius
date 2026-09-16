import { Button, FrownIcon, LoadingSpinner } from "@galacius/design-system";
import { FC } from "react";
import type { AvailableCatalogEntry } from "../hooks/usePluginCatalog";
import { PluginCard } from "./PluginCard";
import { PluginCardFallback } from "./PluginCardFallback";

export const AvailablePluginsSection: FC<{
  isMarketplaceError: boolean;
  marketplaceError: Error | null;
  onGoToMarketplaceSettings?: () => void;
  isLoadingMarketplace: boolean;
  available: AvailableCatalogEntry[];
  hostVersion: string;
  hostPlatform: string | undefined;
  removingIds: Set<string>;
  onInstall: (pluginId: string, pluginName: string) => void;
  onRemove: (pluginId: string, pluginName: string) => void;
}> = ({
  isMarketplaceError,
  marketplaceError,
  onGoToMarketplaceSettings,
  isLoadingMarketplace,
  available,
  hostVersion,
  hostPlatform,
  removingIds,
  onInstall,
  onRemove,
}) => {
  if (isMarketplaceError) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-16 text-center">
        <div>
          <FrownIcon className="mx-auto mb-3 size-12 text-muted-foreground" />
          <p className="text-lg font-medium text-destructive">Couldn&apos;t load marketplace</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {marketplaceError?.message || "Check your Access Token in Settings"}
          </p>
        </div>
        {marketplaceError?.message && (
          <div>
            <p className="mt-2 text-xs text-muted-foreground">
              Please check your Marketplace Repository URL
            </p>
            <Button className="mt-4" onClick={onGoToMarketplaceSettings}>
              Go to Marketplace settings
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (isLoadingMarketplace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">Loading available plugins...</p>
      </div>
    );
  }

  if (available.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-muted-foreground">No available plugins</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-6">
      {available.map(({ id, manifest, installStatus: installStatusEntry }) => {
        if (!manifest) {
          return (
            <PluginCardFallback
              key={id}
              status={installStatusEntry!}
              onRemove={() => onRemove(id, id)}
              isRemoving={removingIds.has(id)}
            />
          );
        }

        return (
          <PluginCard
            key={id}
            plugin={manifest}
            hostVersion={hostVersion}
            hostPlatform={hostPlatform}
            installStatus={installStatusEntry ? "INSTALLING" : "NOT_INSTALLED"}
            installProgress={installStatusEntry?.progress ?? 0}
            updateAvailable={false}
            installedVersion={undefined}
            installedSize={undefined}
            onInstall={() => onInstall(id, manifest.name)}
            onUpdate={undefined}
            onRetry={undefined}
            onRemove={undefined}
            isRemoving={false}
          />
        );
      })}
    </div>
  );
};
