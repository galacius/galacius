import {
  Badge,
  Button,
  ConfirmationModal,
  Loader2Icon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Trash2Icon,
} from "@galacius/design-system";
import { FC, useState } from "react";
import type { dto } from "@wailsjs/go/models";
import { formatBytes } from "../utils/formatBytes";
import { pluginLogoUrl } from "../utils/pluginLogoUrl";
import { PluginLogo } from "./PluginLogo";

interface PluginCardFallbackProps {
  status: dto.InstalledPlugin;
  onRemove: () => void | Promise<void>;
  isRemoving: boolean;
}

export const PluginCardFallback: FC<PluginCardFallbackProps> = ({
  status,
  onRemove,
  isRemoving,
}) => {
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  const handleRemoveClick = async () => {
    try {
      await onRemove();
      setIsRemoveDialogOpen(false);
    } catch (error) {
      console.error("Failed to remove plugin:", error);
    }
  };

  return (
    <div className="max-w-sm min-w-72 flex-1 basis-full overflow-hidden rounded-lg border-3 border-border opacity-60 shadow-sm sm:basis-[calc(50%-0.75rem)] xl:basis-[calc(33.333%-1rem)]">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PluginLogo
              src={pluginLogoUrl(status.pluginId, true, status.assets?.logo, status.logoUrl)}
              alt={`${status.pluginId} logo`}
            />
            <h3 className="text-h3 font-medium">{status.pluginId}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge className="border border-gray-200 bg-gray-50 text-gray-900">
                    {status.status}
                  </Badge>
                }
              />
              <TooltipContent>
                This plugin&apos;s metadata is unavailable in the marketplace
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
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="border-b border-border px-4 py-3">
        <div className="text-caption flex items-center justify-between text-muted-foreground">
          <div>{status.installedVersion ? `v${status.installedVersion}` : "(version unknown)"}</div>
          <div>{status.size ? formatBytes(status.size) : null}</div>
        </div>
      </div>

      {/* Footer with remove button */}
      <div className="border-t border-border px-4 py-3">
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setIsRemoveDialogOpen(true)}
          disabled={isRemoving}
        >
          {isRemoving ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
          Remove
        </Button>
      </div>

      <ConfirmationModal
        open={isRemoveDialogOpen}
        title={`Remove Plugin: ${status.pluginId}`}
        description="This plugin will be permanently removed from your system. You can reinstall it anytime if it becomes available in the marketplace again."
        confirmLabel="Remove"
        confirmVariant="destructive"
        isPending={isRemoving}
        onClose={() => setIsRemoveDialogOpen(false)}
        onConfirm={handleRemoveClick}
      />
    </div>
  );
};
