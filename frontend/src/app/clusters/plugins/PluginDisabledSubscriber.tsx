import { FC } from "react";
import { usePluginDisabledEventSubscription } from "./hooks/usePluginDisabledEventSubscription";

// Renders inside MainLayoutProvider (which mounts UnifiedTrayProvider) so
// usePluginDisabledEventSubscription's useUnifiedTray() has a provider in
// its ancestor tree — this component itself doesn't render anything.
export const PluginDisabledSubscriber: FC = () => {
  usePluginDisabledEventSubscription();
  return null;
};
