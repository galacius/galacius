import { Button, CircleXIcon, EmptyState } from "@galacius/design-system";
import { FC } from "react";

interface PluginCrashedErrorProps {
  onGoToMarketplace?: () => void;
}

export const PluginCrashedError: FC<PluginCrashedErrorProps> = ({ onGoToMarketplace }) => {
  return (
    <EmptyState
      icon={<CircleXIcon className="h-8 w-8" />}
      title="Plugin Failed to Load"
      description="The plugin encountered an error and could not be loaded. Try reinstalling or contact support."
      action={
        <div className="flex gap-3">
          {onGoToMarketplace && (
            <Button variant="secondary" onClick={onGoToMarketplace}>
              Go to Marketplace
            </Button>
          )}
        </div>
      }
    />
  );
};
