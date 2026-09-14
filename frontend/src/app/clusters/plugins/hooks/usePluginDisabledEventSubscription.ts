import { useEffect, useRef } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { useUnifiedTray } from "../../shared/components/trays/unified/UnifiedTrayContext";

/**
 * Subscribes to plugin:disabled events and closes any open tray tabs
 * owned by the disabled plugin.
 */
export function usePluginDisabledEventSubscription(): void {
  const { tabs, closeTab } = useUnifiedTray();
  const tabsRef = useRef(tabs);
  const closeTabRef = useRef(closeTab);

  // Keep refs up-to-date without re-subscribing
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    closeTabRef.current = closeTab;
  }, [closeTab]);

  useEffect(() => {
    return EventsOn("plugin:disabled", (pluginId: string) => {
      // Close only tabs belonging to the disabled plugin
      tabsRef.current.forEach((tab) => {
        if (tab.origin === "plugin" && tab.pluginId === pluginId) {
          closeTabRef.current(tab.id);
        }
      });
    });
  }, []);
}
