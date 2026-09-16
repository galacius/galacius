import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect } from "react";
import { pluginEventRegistry } from "./pluginEventRegistry";

interface PluginEventPayload {
  pluginId: string;
  eventName: string;
  payload: unknown;
}

export function usePluginEventListener(): void {
  useEffect(() => {
    return EventsOn("plugin:event", (eventPayload: unknown) => {
      const payload = eventPayload as PluginEventPayload;
      const handler = pluginEventRegistry.getHandler(payload.eventName);
      if (handler) {
        try {
          handler(payload.payload);
        } catch (err) {
          console.error(`Error in handler for event ${payload.eventName}:`, err);
        }
      }
    });
  }, []);
}
