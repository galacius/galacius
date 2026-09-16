import { Button, EyeOffIcon, EmptyState } from "@galacius/design-system";
import { FC } from "react";

interface PluginDisabledEmptyStateProps {
  onGoToMarketplace?: () => void;
}

export const PluginDisabledEmptyState: FC<PluginDisabledEmptyStateProps> = ({
  onGoToMarketplace,
}) => {
  return (
    <EmptyState
      icon={<EyeOffIcon className="h-8 w-8" />}
      title="This plugin is disabled"
      description="Re-enable this plugin in the Marketplace to use it."
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
