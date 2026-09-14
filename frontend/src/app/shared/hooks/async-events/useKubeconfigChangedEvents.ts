import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { QUERY_KEY_CONTEXTS_GROUPED } from "../../../shared/api/api.const";

export function useKubeconfigChangedEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    return EventsOn("kubeconfig:changed", () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CONTEXTS_GROUPED] });
    });
  }, [queryClient]);
}
