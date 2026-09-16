import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { HPA } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "hpas:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitHPAs), so this hook
// no longer needs to know about namespaces at all.
export function useHPAsUpdateEvents(): HPA[] {
  const [latestHPAs, setLatestHPAs] = useState<HPA[]>([]);

  useEffect(() => {
    return EventsOn("hpas:update", (data: HPA[]) => {
      startTransition(() => {
        setLatestHPAs(data);
      });
    });
  }, []);

  return latestHPAs;
}
