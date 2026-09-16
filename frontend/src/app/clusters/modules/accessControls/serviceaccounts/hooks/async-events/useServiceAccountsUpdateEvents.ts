import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { ServiceAccount } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "serviceaccounts:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitServiceAccounts), so this hook
// no longer needs to know about namespaces at all.
export function useServiceAccountsUpdateEvents(): ServiceAccount[] {
  const [latestServiceAccounts, setLatestServiceAccounts] = useState<ServiceAccount[]>([]);

  useEffect(() => {
    return EventsOn("serviceaccounts:update", (data: ServiceAccount[]) => {
      startTransition(() => {
        setLatestServiceAccounts(data);
      });
    });
  }, []);

  return latestServiceAccounts;
}
