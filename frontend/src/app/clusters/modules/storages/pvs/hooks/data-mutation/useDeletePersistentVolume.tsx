import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeletePersistentVolume } from "@wailsjs/go/app/App";
import {
  QUERY_KEY_PVS,
  QUERY_KEY_PERSISTENT_VOLUME_DETAIL,
  QUERY_KEY_PERSISTENT_VOLUME_YAML,
} from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeletePersistentVolume = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => DeletePersistentVolume(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PVS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PERSISTENT_VOLUME_DETAIL, { name }] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PERSISTENT_VOLUME_YAML, { name }] });
      renderSuccessToast({
        title: "PersistentVolume deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete PersistentVolume",
        description: `Error deleting PersistentVolume: ${String(err)}`,
      }),
  });
};
