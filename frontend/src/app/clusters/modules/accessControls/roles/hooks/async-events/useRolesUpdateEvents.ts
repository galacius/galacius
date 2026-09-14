import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { Role } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "roles:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitRoles), so this hook
// no longer needs to know about namespaces at all.
export function useRolesUpdateEvents(): Role[] {
  const [latestRoles, setLatestRoles] = useState<Role[]>([]);

  useEffect(() => {
    return EventsOn("roles:update", (data: Role[]) => {
      startTransition(() => {
        setLatestRoles(data);
      });
    });
  }, []);

  return latestRoles;
}
