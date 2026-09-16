import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { PodDisruptionBudget } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "pdbs:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitPodDisruptionBudgets), so this hook
// no longer needs to know about namespaces at all.
export function usePodDisruptionBudgetsUpdateEvents(): PodDisruptionBudget[] {
  const [latestPodDisruptionBudgets, setLatestPodDisruptionBudgets] = useState<
    PodDisruptionBudget[]
  >([]);

  useEffect(() => {
    return EventsOn("pdbs:update", (data: PodDisruptionBudget[]) => {
      startTransition(() => {
        setLatestPodDisruptionBudgets(data);
      });
    });
  }, []);

  return latestPodDisruptionBudgets;
}
