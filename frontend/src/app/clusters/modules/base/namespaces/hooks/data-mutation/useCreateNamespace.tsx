import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateNamespace } from "@wailsjs/go/app/App";
import { QUERY_KEY_NAMESPACES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useCreateNamespace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => CreateNamespace(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NAMESPACES] });
      renderSuccessToast({ title: "Namespace created", description: name });
    },
    onError: (err, name) =>
      renderErrorToast({
        title: "Failed to create Namespace",
        description: `${name}: ${String(err)}`,
      }),
  });
};
