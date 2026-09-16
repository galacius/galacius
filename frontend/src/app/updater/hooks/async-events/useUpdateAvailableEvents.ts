import { useEffect, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { GetLastUpdateCheckResult } from "@wailsjs/go/app/App";

const DISMISSED_UPDATE_KEY = "galacius:dismissed-update";

export interface UpdateInfo {
  latestVersion: string;
  releaseURL: string;
  downloadSize: string;
}

export interface UseUpdateAvailableEventsResult {
  updateInfo: UpdateInfo | null;
  updateModalOpen: boolean;
  setUpdateModalOpen: (open: boolean) => void;
  dismissUpdate: () => void;
}

export function useUpdateAvailableEvents(): UseUpdateAvailableEventsResult {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  // Mount-time hydration: recover cached update state after Ctrl+R reload
  useEffect(() => {
    GetLastUpdateCheckResult().then((cached) => {
      if (cached?.latestVersion) applyUpdateInfo(cached, setUpdateInfo, setUpdateModalOpen);
    });
  }, []);

  // Live event subscription for fresh checks while mounted
  useEffect(() => {
    return EventsOn(
      "update:available",
      (payload: { latestVersion: string; releaseURL: string; downloadSize: string }) => {
        applyUpdateInfo(payload, setUpdateInfo, setUpdateModalOpen);
      }
    );
  }, []);

  const dismissUpdate = () => {
    setUpdateModalOpen(false);
    if (updateInfo) localStorage.setItem(DISMISSED_UPDATE_KEY, updateInfo.latestVersion);
  };

  return { updateInfo, updateModalOpen, setUpdateModalOpen, dismissUpdate };
}

// Helper to apply update info and check dismissal status
function applyUpdateInfo(
  payload: { latestVersion: string; releaseURL: string; downloadSize?: string },
  setUpdateInfo: (info: UpdateInfo | null) => void,
  setUpdateModalOpen: (open: boolean) => void
) {
  const info: UpdateInfo = {
    latestVersion: payload.latestVersion,
    releaseURL: payload.releaseURL,
    downloadSize: payload.downloadSize ?? "",
  };

  setUpdateInfo(info);

  const dismissed = localStorage.getItem(DISMISSED_UPDATE_KEY);
  if (dismissed !== info.latestVersion) setUpdateModalOpen(true);
}
