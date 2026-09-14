import { startTransition, useEffect, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import type { ClusterRole } from "../../api/resources";

export function useClusterRolesUpdateEvents(): ClusterRole[] {
  const [latestClusterRoles, setLatestClusterRoles] = useState<ClusterRole[]>([]);
  useEffect(() => {
    return EventsOn("clusterroles:update", (data: ClusterRole[]) => {
      startTransition(() => {
        setLatestClusterRoles(data);
      });
    });
  }, []);
  return latestClusterRoles;
}
