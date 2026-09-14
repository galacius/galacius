import { startTransition, useEffect, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import type { StorageClass } from "../../api/resources";

// Data-only event hook: tracks the latest pushed storage classes in local state.
// Called directly from storage class data-access hooks (useGetStorageClasses, useGetStorageClassByName, useGetStorageClassYAML)
// to merge event-driven data locally without cache-wide side effects.
export function useStorageClassesUpdateEvents(): StorageClass[] {
  const [latestStorageClasses, setLatestStorageClasses] = useState<StorageClass[]>([]);
  useEffect(() => {
    return EventsOn("storageclasses:update", (data: StorageClass[]) => {
      startTransition(() => {
        setLatestStorageClasses(data);
      });
    });
  }, []);
  return latestStorageClasses;
}
