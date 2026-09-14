import type { PluginSettingsTab } from "@galacius/core";
import { useSyncExternalStore } from "react";
import { pluginSettingsRegistry } from "./pluginSettingsRegistry";

export function usePluginSettingsTabs(): PluginSettingsTab[] {
  return useSyncExternalStore(
    pluginSettingsRegistry.subscribeSettingsRegistry.bind(pluginSettingsRegistry),
    pluginSettingsRegistry.getSettingsTabs.bind(pluginSettingsRegistry)
  );
}
