import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { Node } from "../../api/resources";
import { UnwatchNodeDetail, WatchNodeDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Node (name) as "watched"
// with the backend (see App.WatchNodeDetail), then listens for "node:update"
// (singular — distinct from the plural list topic) pushes carrying the full
// detail payload. Used by useGetNodeDetail to merge live updates locally
// without invalidate/refetch.
export function useNodeDetailUpdateEvents(name: string): Node | undefined {
  const [latestNode, setLatestNode] = useState<Node | undefined>(undefined);

  useEffect(() => {
    if (!name) {
      return;
    }

    WatchNodeDetail(name);

    const cancel = EventsOn("node:update", (data: Node) => {
      if (data.Name === name) {
        startTransition(() => {
          setLatestNode(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchNodeDetail(name);
    };
  }, [name]);

  // Discard any Node pushed for a previous name rather than resetting state
  // synchronously in the effect above (which would trigger a cascading render).
  return useMemo(() => {
    if (latestNode && latestNode.Name === name) {
      return latestNode;
    }
    return undefined;
  }, [latestNode, name]);
}
