import type { PluginFooterWidget } from "@galacius/core";
import { useSyncExternalStore } from "react";
import { pluginFooterRegistry } from "./pluginFooterRegistry";

export function usePluginFooterWidgets(): Array<{ pluginId: string; widget: PluginFooterWidget }> {
  return useSyncExternalStore(
    pluginFooterRegistry.subscribeFooterRegistry.bind(pluginFooterRegistry),
    pluginFooterRegistry.getFooterWidgets.bind(pluginFooterRegistry)
  );
}
