import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { CronJob } from "../../api/resources";
import { UnwatchCronJobDetail, WatchCronJobDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific CronJob (namespace/name) as
// "watched" with the backend (see App.WatchCronJobDetail), then listens for
// "cronjob:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetCronJobDetail to merge live updates
// locally without invalidate/refetch.
export function useCronJobDetailUpdateEvents(namespace: string, name: string): CronJob | undefined {
  const [latestCronJob, setLatestCronJob] = useState<CronJob | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchCronJobDetail(namespace, name);

    const cancel = EventsOn("cronjob:update", (data: CronJob) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestCronJob(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchCronJobDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any CronJob pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestCronJob && latestCronJob.Namespace === namespace && latestCronJob.Name === name) {
      return latestCronJob;
    }
    return undefined;
  }, [latestCronJob, namespace, name]);
}
