import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { CheckForUpdate } from "@wailsjs/go/app/App";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * `UpdateModal` already opens itself automatically whenever the backend emits
 * `update:available` (see `useUpdateAvailableEvents`), unless the user previously
 * dismissed that same version. `onUpdateAvailable` is called on a successful manual
 * check so the caller can force the modal open even in that dismissed case.
 */
export const useCheckForUpdate = (onUpdateAvailable?: () => void) => {
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const toastShownRef = useRef(false);
  const onUpdateAvailableRef = useRef(onUpdateAvailable);

  useEffect(() => {
    onUpdateAvailableRef.current = onUpdateAvailable;
  }, [onUpdateAvailable]);

  // Subscribe to update check events
  useEffect(() => {
    const unsubscribeAvailable = EventsOn("update:available", () => {
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        onUpdateAvailableRef.current?.();
      }
    });

    const unsubscribeCheckComplete = EventsOn("update:check-complete", () => {
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        renderSuccessToast({
          title: "Up to date",
          description: "You're running the latest version of Galacius.",
        });
      }
    });

    return () => {
      unsubscribeAvailable();
      unsubscribeCheckComplete();
    };
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (checkingForUpdate) return;

    setCheckingForUpdate(true);
    toastShownRef.current = false;
    try {
      await CheckForUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      renderErrorToast({
        title: "Update check failed",
        description: message,
      });
    } finally {
      setCheckingForUpdate(false);
    }
  }, [checkingForUpdate]);

  return { checkingForUpdate, checkForUpdate };
};
