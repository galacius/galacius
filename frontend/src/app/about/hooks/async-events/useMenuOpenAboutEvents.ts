import { useEffect, useRef } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";

export interface MenuOpenAboutPayload {
  version: string;
  go: string;
  wails: string;
  k8sClient: string;
  appSizeBytes: string;
  installSource: string;
}

export function useMenuOpenAboutEvents(onOpenAbout: (payload: MenuOpenAboutPayload) => void): void {
  const callbackRef = useRef(onOpenAbout);

  useEffect(() => {
    callbackRef.current = onOpenAbout;
  }, [onOpenAbout]);

  useEffect(() => {
    return EventsOn("menu:open-about", (payload?: MenuOpenAboutPayload) => {
      callbackRef.current(
        payload ?? {
          version: "",
          go: "",
          wails: "",
          k8sClient: "",
          appSizeBytes: "",
          installSource: "",
        }
      );
    });
  }, []);
}
