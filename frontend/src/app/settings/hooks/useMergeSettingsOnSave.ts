import { useQueryClient } from "@tanstack/react-query";
import { config } from "@wailsjs/go/models";
import { GetSettings } from "@wailsjs/go/app/App";
import { QUERY_KEY_SETTINGS } from "../api/api.const";
import { useSaveSettings } from "./data-mutation/useSaveSettings";

export const useMergeSettingsOnSave = () => {
  const queryClient = useQueryClient();
  const { mutateAsync } = useSaveSettings();

  return async (updates: Partial<config.Settings>) => {
    // Ensure we always have the latest settings before merging.
    // If cache is undefined (e.g., useGetSettings hasn't resolved yet),
    // this fetches the authoritative settings from the backend.
    // This prevents silent data loss when saving partial updates.
    const latest = await queryClient.ensureQueryData<config.Settings>({
      queryKey: [QUERY_KEY_SETTINGS],
      queryFn: () => GetSettings(),
    });

    return mutateAsync(
      config.Settings.createFrom({
        ...latest,
        ...updates,
      })
    );
  };
};
