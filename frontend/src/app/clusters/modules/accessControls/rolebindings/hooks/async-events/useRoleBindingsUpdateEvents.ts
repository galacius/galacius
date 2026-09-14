import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { RoleBinding } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "rolebindings:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitRoleBindings), so this hook
// no longer needs to know about namespaces at all.
export function useRoleBindingsUpdateEvents(): RoleBinding[] {
  const [latestRoleBindings, setLatestRoleBindings] = useState<RoleBinding[]>([]);

  useEffect(() => {
    return EventsOn("rolebindings:update", (data: RoleBinding[]) => {
      startTransition(() => {
        setLatestRoleBindings(data);
      });
    });
  }, []);

  return latestRoleBindings;
}
