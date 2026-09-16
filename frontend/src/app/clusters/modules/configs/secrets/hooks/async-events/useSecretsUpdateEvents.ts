import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { Secret } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "secrets:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitSecrets), so this hook
// no longer needs to know about namespaces at all.
export function useSecretsUpdateEvents(): Secret[] {
  const [latestSecrets, setLatestSecrets] = useState<Secret[]>([]);

  useEffect(() => {
    return EventsOn("secrets:update", (data: Secret[]) => {
      startTransition(() => {
        setLatestSecrets(data);
      });
    });
  }, []);

  return latestSecrets;
}
