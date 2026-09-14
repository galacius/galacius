import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { Job } from "../../api/resources";
import { UnwatchJobDetail, WatchJobDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Job (namespace/name) as
// "watched" with the backend (see App.WatchJobDetail), then listens for
// "job:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetJobDetail to merge live updates
// locally without invalidate/refetch.
export function useJobDetailUpdateEvents(namespace: string, name: string): Job | undefined {
  const [latestJob, setLatestJob] = useState<Job | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchJobDetail(namespace, name);

    const cancel = EventsOn("job:update", (data: Job) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestJob(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchJobDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any Job pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestJob && latestJob.Namespace === namespace && latestJob.Name === name) {
      return latestJob;
    }
    return undefined;
  }, [latestJob, namespace, name]);
}
