import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SaveLocaleTimezone } from "@wailsjs/go/app/App";
import { QUERY_KEY_SETTINGS } from "../../api/api.const";

export const useSaveLocaleTimezone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tz: string) => SaveLocaleTimezone(tz),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SETTINGS] });
    },
  });
};
