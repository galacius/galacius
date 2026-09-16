import { Button, EmptyState, PackageIcon } from "@galacius/design-system";
import { FC } from "react";

interface PluginNotInstalledEmptyStateProps {
  pluginName: string;
  onGoToMarketplace?: () => void;
}

export const PluginNotInstalledEmptyState: FC<PluginNotInstalledEmptyStateProps> = ({
  pluginName,
  onGoToMarketplace,
}) => {
  return (
    <EmptyState
      icon={<PackageIcon className="h-8 w-8" />}
      title={`${pluginName} Plugin Not Installed`}
      description={`The ${pluginName} plugin is not currently installed. Visit the Marketplace to download and install it.`}
      action={onGoToMarketplace && <Button onClick={onGoToMarketplace}>Go to Marketplace</Button>}
    />
  );
};
