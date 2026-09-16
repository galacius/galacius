import { useEffect, useRef } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";

export function useMenuOpenSettingsEvents(onOpenSettings: () => void): void {
  const callbackRef = useRef(onOpenSettings);

  useEffect(() => {
    callbackRef.current = onOpenSettings;
  }, [onOpenSettings]);

  useEffect(() => {
    return EventsOn("menu:open-settings", () => callbackRef.current());
  }, []);
}
