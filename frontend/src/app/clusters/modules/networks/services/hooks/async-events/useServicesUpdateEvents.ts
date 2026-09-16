import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { Service } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "services:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitServices), so this hook
// no longer needs to know about namespaces at all.
export function useServicesUpdateEvents(): Service[] {
  const [latestServices, setLatestServices] = useState<Service[]>([]);

  useEffect(() => {
    return EventsOn("services:update", (data: Service[]) => {
      startTransition(() => {
        setLatestServices(data);
      });
    });
  }, []);

  return latestServices;
}
