import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { CronJob } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "cronjobs:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitCronJobs), so this hook
// no longer needs to know about namespaces at all.
export function useCronJobsUpdateEvents(): CronJob[] {
  const [latestCronJobs, setLatestCronJobs] = useState<CronJob[]>([]);

  useEffect(() => {
    return EventsOn("cronjobs:update", (data: CronJob[]) => {
      startTransition(() => {
        setLatestCronJobs(data);
      });
    });
  }, []);

  return latestCronJobs;
}
