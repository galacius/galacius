import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";

// The backend pre-filters "events:warning:update" by the currently active
// namespace selection (see App.SetActiveNamespaces / emitEvents), so this
// hook no longer needs to know about namespaces at all.
export function useWarningEventsUpdateEvents(): boolean {
  const [triggerRefresh, setTriggerRefresh] = useState(false);

  useEffect(() => {
    return EventsOn("events:warning:update", () => {
      startTransition(() => {
        setTriggerRefresh((prev) => !prev);
      });
    });
  }, []);

  return triggerRefresh;
}
