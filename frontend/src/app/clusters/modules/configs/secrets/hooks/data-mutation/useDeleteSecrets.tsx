import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteSecrets } from "@wailsjs/go/app/App";
import { QUERY_KEY_SECRETS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteSecrets = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteSecrets(items),
    onSuccess: (_, { items }) => {
      const count = items.length;
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SECRETS] });
      renderSuccessToast({
        title: "Secrets deleted",
        description: `${count} secret${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete Secrets",
        description: `Error deleting Secrets: ${String(err)}`,
      }),
  });
};
