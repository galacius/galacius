import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect } from "react";

export interface ClusterConnectionLostPayload {
  context: string;
  message: string;
}

// Fires when the backend tears down a context's clientset/informers because
// its setup-command proxy died mid-session (see App.handleProxyLost in
// internal/app/app.go) — e.g. a tunnel that doesn't survive the machine
// sleeping for a long time. Unlike SetupCommandDegraded/Crashed, which only
// drive the passive footer status dot, this tells the app the active session
// itself is dead and needs a fresh Connect().
export function useClusterConnectionLostEvents(
  onConnectionLost: (payload: ClusterConnectionLostPayload) => void
): void {
  useEffect(() => {
    return EventsOn("cluster:connectionLost", (payload: ClusterConnectionLostPayload) => {
      onConnectionLost(payload);
    });
  }, [onConnectionLost]);
}
