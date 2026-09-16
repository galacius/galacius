import { useEffect, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";

export interface ConnectStatusLine {
  message: string;
  isError: boolean;
}

export interface WarningBanner {
  title: string;
  description?: string;
}

export interface ConnectStatusResult {
  lines: ConnectStatusLine[];
  warningBanner: WarningBanner | null;
}

export function useConnectStatusEvents(contextName: string): ConnectStatusResult {
  const [lines, setLines] = useState<ConnectStatusLine[]>([]);
  const [warningBanner, setWarningBanner] = useState<WarningBanner | null>(null);

  useEffect(() => {
    let isActive = true;

    const unsubscribeStatus = EventsOn(
      "connect:status",
      (payload: { context: string; message: string }) => {
        if (payload.context !== contextName || !isActive) return;
        const setupCommandMessages = ["Starting proxy server", "Connecting to proxy server..."];
        const isSetupMessage = setupCommandMessages.some((msg) => payload.message.includes(msg));
        const isError =
          !isSetupMessage &&
          (payload.message.startsWith("Failed") || payload.message.startsWith("Cannot"));
        setLines((prev) => [...prev, { message: payload.message, isError }]);
      }
    );

    const unsubscribeDegraded = EventsOn(
      "SetupCommandDegraded",
      (payload: { context: string; message: string }) => {
        if (payload.context !== contextName || !isActive) return;
        setWarningBanner({ title: "Setup Command Failed", description: payload.message });
      }
    );

    const unsubscribeCrashed = EventsOn(
      "SetupCommandCrashed",
      (payload: { context: string; message: string }) => {
        if (payload.context !== contextName || !isActive) return;
        setWarningBanner({ title: "Setup Command Crashed", description: payload.message });
      }
    );

    const unsubscribePortInUse = EventsOn(
      "SetupCommandPortInUse",
      (payload: { context: string; message: string }) => {
        if (payload.context !== contextName || !isActive) return;
        setWarningBanner({ title: "Setup Command Error", description: payload.message });
      }
    );

    return () => {
      isActive = false;
      unsubscribeStatus();
      unsubscribeDegraded();
      unsubscribeCrashed();
      unsubscribePortInUse();
    };
  }, [contextName]);

  return { lines, warningBanner };
}
