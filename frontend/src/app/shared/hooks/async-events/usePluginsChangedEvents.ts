import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";

export function usePluginsChangedEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    return EventsOn("plugins:changed", () => {
      queryClient.invalidateQueries({ queryKey: ["installed-plugins"] });
      queryClient.invalidateQueries({ queryKey: ["plugin-status"] });
    });
  }, [queryClient]);
}
