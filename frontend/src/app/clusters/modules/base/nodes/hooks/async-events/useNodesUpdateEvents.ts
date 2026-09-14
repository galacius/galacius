import { startTransition, useEffect, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import type { Node } from "../../api/resources";

// Data-only event hook: tracks the latest pushed nodes in local state.
// Called directly from node data-access hooks (useGetNodes, useGetNodeDetail, useGetNodeYAML)
// to merge event-driven data locally without cache-wide side effects.
export function useNodesUpdateEvents(): Node[] {
  const [latestNodes, setLatestNodes] = useState<Node[]>([]);
  useEffect(() => {
    return EventsOn("nodes:update", (data: Node[]) => {
      startTransition(() => {
        setLatestNodes(data);
      });
    });
  }, []);
  return latestNodes;
}
