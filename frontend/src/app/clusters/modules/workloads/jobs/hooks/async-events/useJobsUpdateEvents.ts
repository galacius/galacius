import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { Job } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "jobs:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitJobs), so this hook
// no longer needs to know about namespaces at all.
export function useJobsUpdateEvents(): Job[] {
  const [latestJobs, setLatestJobs] = useState<Job[]>([]);

  useEffect(() => {
    return EventsOn("jobs:update", (data: Job[]) => {
      startTransition(() => {
        setLatestJobs(data);
      });
    });
  }, []);

  return latestJobs;
}
