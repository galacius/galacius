import {
  Badge,
  cn,
  ConfirmationModal,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TruncatedText,
} from "@galacius/design-system";
import { FC, useCallback, useMemo, useState } from "react";
import { PluginManifest } from "../hooks/data-access/useGetPluginsFromMarketplace";
import { formatBytes } from "../utils/formatBytes";
import { pluginLogoUrl } from "../utils/pluginLogoUrl";
import { compareVersions } from "../utils/semver";
import { PluginCardActions } from "./PluginCardActions";
import { PluginCardFooter } from "./PluginCardFooter";
import { PluginCardMetadata } from "./PluginCardMetadata";
import { PluginLogo } from "./PluginLogo";

// Keys match Manifest.os (Go GOOS values); labels are the human-readable names shown in chips.
const OS_CHIPS: { key: "linux" | "darwin" | "windows"; label: string }[] = [
  { key: "linux", label: "Linux" },
  { key: "darwin", label: "MacOS" },
  { key: "windows", label: "Windows" },
];

interface PluginCardProps {
  plugin: PluginManifest;
  hostVersion: string;
  hostPlatform?: string; // "linux" | "darwin" | "windows" — highlights the matching compatibility chip
  installStatus: "NOT_INSTALLED" | "INSTALLING" | "READY" | "CRASHED" | "INCOMPATIBLE" | "DISABLED";
  installProgress?: number; // 0-100 for downloading
  updateAvailable?: boolean;
  installedVersion?: string;
  installedSize?: number;
  isDisabling?: boolean;
  isEnabling?: boolean;
  onInstall?: () => void;
  onUpdate?: () => void;
  onRetry?: () => void;
  onRemove?: (pluginID: string) => void | Promise<void>;
  onDisable?: (pluginID: string) => void | Promise<void>;
  onEnable?: (pluginID: string) => void | Promise<void>;
  isRemoving?: boolean;
}

export const PluginCard: FC<PluginCardProps> = ({
  plugin,
  hostVersion,
  hostPlatform,
  installStatus,
  installProgress = 0,
  updateAvailable = false,
  installedVersion,
  installedSize,
  isDisabling = false,
  isEnabling = false,
  onInstall,
  onUpdate,
  onRetry,
  onRemove,
  onDisable,
  onEnable,
  isRemoving = false,
}) => {
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);

  const isCompatible = useMemo(() => {
    // Dev builds report hostVersion="dev" (not semver) — skip the gate, it only applies to releases
    if (import.meta.env.DEV) return true;
    try {
      return (
        compareVersions(hostVersion, plugin.minimumHostVersion) >= 0 &&
        compareVersions(hostVersion, plugin.maximumHostVersion) <= 0
      );
    } catch {
      return false;
    }
  }, [hostVersion, plugin]);

  const isDisabled = !isCompatible;
  const isPluginDisabled = installStatus === "DISABLED";
  const isVerifying = installStatus === "INSTALLING";

  const handleRemoveClick = useCallback(async () => {
    try {
      await onRemove?.(plugin.id);
      setIsRemoveDialogOpen(false);
    } catch (error) {
      // Error is logged in the hook, dialog stays open to let user retry
      console.error("Failed to remove plugin:", error);
    }
  }, [onRemove, plugin.id]);

  const handleDisableClick = useCallback(async () => {
    try {
      await onDisable?.(plugin.id);
      setIsDisableDialogOpen(false);
    } catch (error) {
      // Error is logged in the hook, dialog stays open to let user retry
      console.error("Failed to disable plugin:", error);
    }
  }, [onDisable, plugin.id]);

  const handleEnableClick = useCallback(async () => {
    try {
      await onEnable?.(plugin.id);
    } catch (error) {
      // Error is logged in the hook
      console.error("Failed to enable plugin:", error);
    }
  }, [onEnable, plugin.id]);

  // Total download size (bundle + binary) — matches what actually lands on
  // disk, unlike plugin.bundle.size alone which is just the JS bundle asset.
  const marketplacePluginSize = formatBytes(plugin.bundle.size + plugin.binary.size);

  return (
    <div
      className={cn(
        "shadow-depth-1 transition-interactive max-w-md min-w-72 flex-1 basis-full overflow-hidden rounded-lg border-3 border-border bg-secondary-surface sm:basis-[calc(50%-0.75rem)] xl:basis-[calc(33.333%-1rem)]",
        !isPluginDisabled && "hover:shadow-depth-2 hover:border-ring"
      )}
    >
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PluginLogo
              src={pluginLogoUrl(
                plugin.id,
                installStatus !== "NOT_INSTALLED",
                plugin.assets?.logo,
                plugin.logoUrl
              )}
              alt={`${plugin.name} logo`}
            />
            <h3 className="text-h3 font-medium">{plugin.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {updateAvailable && installStatus === "READY" && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge className="border border-blue-200 bg-blue-50 text-blue-900">
                        Update available
                      </Badge>
                    }
                  />
                  <TooltipContent>
                    A newer version is available. Click Update to download.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {(installStatus === "READY" || installStatus === "CRASHED" || isPluginDisabled) && (
              <PluginCardActions
                isPluginDisabled={isPluginDisabled}
                isDisabling={isDisabling}
                isEnabling={isEnabling}
                isRemoving={isRemoving}
                onEnableOrDisableClick={() =>
                  isPluginDisabled ? handleEnableClick() : setIsDisableDialogOpen(true)
                }
                onRemoveClick={() => setIsRemoveDialogOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Content wrapper — dimmed if plugin is disabled */}
      <div className={cn("pointer-events-none", isPluginDisabled && "opacity-50")}>
        {/* Description */}
        <div className="border-b border-border px-4 py-3">
          <TruncatedText
            text={plugin.description}
            lines={2}
            className="text-body pointer-events-auto min-h-[2lh] text-muted-foreground"
            tooltipClassName="max-w-xs"
          />
        </div>

        {/* Metadata */}
        <div className="border-b border-border px-4 py-3">
          <div className="text-caption flex items-center justify-between text-muted-foreground">
            <PluginCardMetadata
              installStatus={installStatus}
              installedVersion={installedVersion}
              installedSize={installedSize}
            />
          </div>
        </div>

        {/* Compatibility chips */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {OS_CHIPS.map(({ key, label }) => {
              const archs = plugin.os[key];
              if (!archs) return null;
              const isHostPlatform = hostPlatform === key;
              return (
                <Badge
                  key={key}
                  variant={isHostPlatform ? "success" : "default"}
                  className={cn("text-xs", isHostPlatform && "font-semibold")}
                >
                  {label} ({archs.join(", ")})
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer with CTA button */}
      <div className="border-t border-border px-4 py-3">
        <PluginCardFooter
          isPluginDisabled={isPluginDisabled}
          isIncompatible={isDisabled}
          minimumHostVersion={plugin.minimumHostVersion}
          maximumHostVersion={plugin.maximumHostVersion}
          hostVersion={hostVersion}
          installStatus={installStatus}
          updateAvailable={updateAvailable}
          installLabel={`Install v${plugin.version} (${marketplacePluginSize})`}
          updateLabel={`Update v${plugin.version} (${marketplacePluginSize})`}
          installProgress={installProgress}
          isVerifying={isVerifying}
          onInstall={onInstall}
          onUpdate={onUpdate}
          onRetry={onRetry}
        />
      </div>

      <ConfirmationModal
        open={isRemoveDialogOpen}
        title={`Remove Plugin: ${plugin.name}`}
        description="This plugin will be permanently removed from your system. You can reinstall it anytime from the marketplace."
        confirmLabel="Remove"
        confirmVariant="destructive"
        isPending={isRemoving}
        onClose={() => setIsRemoveDialogOpen(false)}
        onConfirm={handleRemoveClick}
      />

      <ConfirmationModal
        open={isDisableDialogOpen}
        title={`Disable Plugin: ${plugin.name}`}
        description="This plugin will be disabled and unloaded. You can re-enable it anytime from the marketplace."
        confirmLabel="Disable"
        isPending={isDisabling}
        onClose={() => setIsDisableDialogOpen(false)}
        onConfirm={handleDisableClick}
      />
    </div>
  );
};
