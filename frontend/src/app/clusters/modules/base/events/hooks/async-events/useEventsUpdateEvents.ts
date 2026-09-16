import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { Event } from "../../api/resources";

// Data-only event hook: tracks the latest pushed events in local state.
// The backend pre-filters "events:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitEvents), so this hook no
// longer needs to know about namespaces at all.
export function useEventsUpdateEvents(): Event[] {
  const [latestEvents, setLatestEvents] = useState<Event[]>([]);

  useEffect(() => {
    return EventsOn("events:update", (data: Event[]) => {
      startTransition(() => {
        setLatestEvents(data);
      });
    });
  }, []);

  return latestEvents;
}
