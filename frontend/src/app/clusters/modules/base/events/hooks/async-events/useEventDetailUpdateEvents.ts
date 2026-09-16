import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { Event } from "../../api/resources";
import { UnwatchEventDetail, WatchEventDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Event (namespace/name) as
// "watched" with the backend (see App.WatchEventDetail), then listens for
// "event:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetEventDetail to merge live updates
// locally without invalidate/refetch.
export function useEventDetailUpdateEvents(namespace: string, name: string): Event | undefined {
  const [latestEvent, setLatestEvent] = useState<Event | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchEventDetail(namespace, name);

    const cancel = EventsOn("event:update", (data: Event) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestEvent(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchEventDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any Event pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestEvent && latestEvent.Namespace === namespace && latestEvent.Name === name) {
      return latestEvent;
    }
    return undefined;
  }, [latestEvent, namespace, name]);
}
