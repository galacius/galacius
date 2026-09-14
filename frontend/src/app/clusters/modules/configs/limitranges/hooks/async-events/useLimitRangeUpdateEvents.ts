import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { LimitRangeDetail } from "../../api/resources";
import { UnwatchLimitRangeDetail, WatchLimitRangeDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific LimitRange
// (namespace/name) as "watched" with the backend (see
// App.WatchLimitRangeDetail), then listens for "limitrange:update"
// (singular — distinct from the "limitranges:update" list topic) pushes
// carrying a full LimitRangeDetail. Only watched LimitRanges are ever
// pushed on this topic. Used by useGetLimitRangeDetail to merge live
// updates locally without invalidate/refetch.
export function useLimitRangeUpdateEvents(
  namespace: string,
  name: string
): LimitRangeDetail | undefined {
  const [latestLimitRange, setLatestLimitRange] = useState<LimitRangeDetail | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchLimitRangeDetail(namespace, name);

    const cancel = EventsOn("limitrange:update", (data: LimitRangeDetail) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestLimitRange(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchLimitRangeDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any value pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (
      latestLimitRange &&
      latestLimitRange.Namespace === namespace &&
      latestLimitRange.Name === name
    ) {
      return latestLimitRange;
    }
    return undefined;
  }, [latestLimitRange, namespace, name]);
}
