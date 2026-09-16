import { startTransition, useEffect, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import type { Namespace } from "../../api/resources";

// Data-only event hook: tracks the latest pushed namespaces in local state.
// Called directly from namespace data-access hooks (useGetNamespaces, useGetNamespaceDetail, useGetNamespaceYAML)
// to merge event-driven data locally without cache-wide side effects.
export function useNamespacesUpdateEvents(): Namespace[] {
  const [latestNamespaces, setLatestNamespaces] = useState<Namespace[]>([]);
  useEffect(() => {
    return EventsOn("namespaces:update", (data: Namespace[]) => {
      startTransition(() => {
        setLatestNamespaces(data);
      });
    });
  }, []);
  return latestNamespaces;
}
