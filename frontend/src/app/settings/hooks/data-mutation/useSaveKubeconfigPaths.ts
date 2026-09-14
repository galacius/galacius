import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SaveKubeconfigPaths } from "@wailsjs/go/app/App";
import { QUERY_KEY_SETTINGS } from "../../api/api.const";

export const useSaveKubeconfigPaths = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paths: string[]) => SaveKubeconfigPaths(paths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SETTINGS] });
    },
  });
};
