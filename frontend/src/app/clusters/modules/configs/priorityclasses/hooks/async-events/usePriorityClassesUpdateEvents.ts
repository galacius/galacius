import { startTransition, useEffect, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import type { PriorityClass } from "../../api/resources";

// Data-only event hook: tracks the latest pushed priority classes in local state.
// Called directly from priority class data-access hooks (useGetPriorityClasses, useGetPriorityClassByName, useGetPriorityClassYAML)
// to merge event-driven data locally without cache-wide side effects.
export function usePriorityClassesUpdateEvents(): PriorityClass[] {
  const [latestPriorityClasses, setLatestPriorityClasses] = useState<PriorityClass[]>([]);
  useEffect(() => {
    return EventsOn("priorityclasses:update", (data: PriorityClass[]) => {
      startTransition(() => {
        setLatestPriorityClasses(data);
      });
    });
  }, []);
  return latestPriorityClasses;
}
