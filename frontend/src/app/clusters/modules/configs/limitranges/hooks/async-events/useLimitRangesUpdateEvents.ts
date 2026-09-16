import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { LimitRange } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "limitranges:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitLimitRanges), so this hook
// no longer needs to know about namespaces at all.
export function useLimitRangesUpdateEvents(): LimitRange[] {
  const [latestLimitRanges, setLatestLimitRanges] = useState<LimitRange[]>([]);

  useEffect(() => {
    return EventsOn("limitranges:update", (data: LimitRange[]) => {
      startTransition(() => {
        setLatestLimitRanges(data);
      });
    });
  }, []);

  return latestLimitRanges;
}
