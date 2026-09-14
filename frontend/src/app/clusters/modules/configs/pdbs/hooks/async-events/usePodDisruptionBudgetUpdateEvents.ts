import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { PodDisruptionBudgetDetail } from "../../api/resources";
import {
  UnwatchPodDisruptionBudgetDetail,
  WatchPodDisruptionBudgetDetail,
} from "../../api/resources";

// Scoped detail event hook: registers this specific PodDisruptionBudget
// (namespace/name) as "watched" with the backend (see
// App.WatchPodDisruptionBudgetDetail), then listens for "pdb:update"
// (singular — distinct from the "pdbs:update" list topic) pushes carrying a
// full PodDisruptionBudgetDetail. Only watched PDBs are ever pushed on this
// topic. Used by useGetPodDisruptionBudgetDetail to merge live updates
// locally without invalidate/refetch.
export function usePodDisruptionBudgetUpdateEvents(
  namespace: string,
  name: string
): PodDisruptionBudgetDetail | undefined {
  const [latestPDB, setLatestPDB] = useState<PodDisruptionBudgetDetail | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchPodDisruptionBudgetDetail(namespace, name);

    const cancel = EventsOn("pdb:update", (data: PodDisruptionBudgetDetail) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestPDB(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchPodDisruptionBudgetDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any value pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestPDB && latestPDB.Namespace === namespace && latestPDB.Name === name) {
      return latestPDB;
    }
    return undefined;
  }, [latestPDB, namespace, name]);
}
