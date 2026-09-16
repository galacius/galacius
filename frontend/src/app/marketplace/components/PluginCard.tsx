import {
  Badge,
  Button,
  cn,
  ConfirmationModal,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Trash2Icon,
} from "@galacius/design-system";
import { FC, useMemo, useState } from "react";
import { PluginManifest } from "../hooks/data-access/useGetPluginsFromMarketplace";
import { formatBytes } from "../utils/formatBytes";
import { pluginLogoUrl } from "../utils/pluginLogoUrl";
import { compareVersions } from "../utils/semver";
import { DownloadProgressIndicator } from "./DownloadProgressIndicator";
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

  const handleRemoveClick = async () => {
    try {
      await onRemove?.(plugin.id);
      setIsRemoveDialogOpen(false);
    } catch (error) {
      // Error is logged in the hook, dialog stays open to let user retry
      console.error("Failed to remove plugin:", error);
    }
  };

  const handleDisableClick = async () => {
    try {
      await onDisable?.(plugin.id);
      setIsDisableDialogOpen(false);
    } catch (error) {
      // Error is logged in the hook, dialog stays open to let user retry
      console.error("Failed to disable plugin:", error);
    }
  };

  const handleEnableClick = async () => {
    try {
      await onEnable?.(plugin.id);
    } catch (error) {
      // Error is logged in the hook
      console.error("Failed to enable plugin:", error);
    }
  };

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
              <>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          isPluginDisabled ? handleEnableClick() : setIsDisableDialogOpen(true)
                        }
                        disabled={isDisabling || isEnabling}
                        aria-label={isPluginDisabled ? "Enable plugin" : "Disable plugin"}
                      >
                        {isDisabling || isEnabling ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : isPluginDisabled ? (
                          <EyeOffIcon className="size-4" />
                        ) : (
                          <EyeIcon className="size-4" />
                        )}
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {isPluginDisabled ? "Enable plugin" : "Disable plugin"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsRemoveDialogOpen(true)}
                        disabled={isRemoving}
                        aria-label="Remove plugin"
                      >
                        {isRemoving ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-4" />
                        )}
                      </Button>
                    }
                  />
                  <TooltipContent>Remove plugin</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content wrapper — dimmed if plugin is disabled */}
      <div className={cn("pointer-events-none", isPluginDisabled && "opacity-50")}>
        {/* Description */}
        <div className="border-b border-border px-4 py-3">
          <p className="text-body text-muted-foreground">{plugin.description}</p>
        </div>

        {/* Metadata */}
        <div className="border-b border-border px-4 py-3">
          <div className="text-caption flex items-center justify-between text-muted-foreground">
            {installStatus === "INSTALLING" && !installedVersion ? (
              <>
                <div className="h-4 w-24 animate-pulse rounded-sm bg-muted" />
                <div className="h-4 w-12 animate-pulse rounded-sm bg-muted" />
              </>
            ) : (
              <>
                <div>
                  {installedVersion
                    ? `v${installedVersion}`
                    : installStatus === "READY"
                      ? "Installed (version unknown)"
                      : "Not installed"}
                </div>
                <div>{installedSize ? formatBytes(installedSize) : null}</div>
              </>
            )}
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
        {isPluginDisabled ? (
          <div className="text-sm text-muted-foreground">Plugin disabled</div>
        ) : isDisabled ? (
          <div className="text-sm text-muted-foreground">
            Requires app {plugin.minimumHostVersion}–{plugin.maximumHostVersion} (you have{" "}
            {hostVersion})
          </div>
        ) : (
          <>
            <Button
              onClick={() => {
                if (installStatus === "NOT_INSTALLED") onInstall?.();
                else if (installStatus === "READY") {
                  if (updateAvailable) onUpdate?.();
                } else if (installStatus === "CRASHED") onRetry?.();
              }}
              disabled={
                installStatus === "INSTALLING" || (installStatus === "READY" && !updateAvailable)
              }
              className="w-full"
              variant={installStatus === "CRASHED" ? "destructive" : "default"}
            >
              {installStatus === "NOT_INSTALLED" &&
                `Install v${plugin.version} (${marketplacePluginSize})`}
              {installStatus === "INSTALLING" && "Downloading..."}
              {installStatus === "READY" &&
                (updateAvailable
                  ? `Update v${plugin.version} (${marketplacePluginSize})`
                  : "Installed")}
              {installStatus === "CRASHED" && "Retry"}
              {installStatus === "INCOMPATIBLE" && "Incompatible"}
            </Button>

            <div className="mt-2">
              <DownloadProgressIndicator
                progress={installProgress}
                isVerifying={isVerifying}
                isVisible={installStatus === "INSTALLING"}
              />
            </div>
          </>
        )}
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
