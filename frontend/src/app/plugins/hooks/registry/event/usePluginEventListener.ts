import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useRef } from "react";
import { useGetInstalledPlugins } from "../../../../marketplace/hooks/data-access/useGetInstalledPlugins";
import { pluginEventRegistry } from "../../../../clusters/plugins/hooks/registry/event/pluginEventRegistry";

interface PluginEventPayload {
  pluginId: string;
  eventName: string;
  payload: unknown;
}

export function usePluginEventListener(): void {
  const { readyPlugins } = useGetInstalledPlugins();
  const livePluginIdsRef = useRef<Set<string>>(new Set());

  // Keep a live ref of ready (not just installed) plugin IDs — a disabled/crashed
  // plugin stays in the installed list, so filtering by status is required to
  // actually stop dispatch to a stale handler pre-cluster-connection.
  useEffect(() => {
    livePluginIdsRef.current = new Set(readyPlugins.map((p) => p.pluginId));
  }, [readyPlugins]);

  useEffect(() => {
    return EventsOn("plugin:event", (eventPayload: unknown) => {
      const payload = eventPayload as PluginEventPayload;

      // Check that the plugin ID is in the live set of installed plugins
      if (!livePluginIdsRef.current.has(payload.pluginId)) {
        return;
      }

      // Check that we have a handler for this specific (pluginId, eventName) pairing
      const handler = pluginEventRegistry.getHandlerFor(payload.pluginId, payload.eventName);
      if (!handler) {
        return;
      }

      try {
        handler(payload.payload);
      } catch (err) {
        console.error(`Error in handler for event ${payload.eventName}:`, err);
      }
    });
  }, []);
}
