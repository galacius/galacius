import { renderErrorToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SaveDefaultNamespaces } from "@wailsjs/go/app/App";
import { QUERY_KEY_NAMESPACE_NAMES } from "../../api/api.const";
import { QUERY_KEY_DEFAULT_NAMESPACES } from "../../../../../shared/api/api.const";

export const useSaveDefaultNamespaces = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contextName, namespaces }: { contextName: string; namespaces: string[] }) =>
      SaveDefaultNamespaces(contextName, namespaces),
    onSuccess: (_, { contextName }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DEFAULT_NAMESPACES, { contextName }] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NAMESPACE_NAMES, contextName] });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to save default namespaces",
        description: String(err),
      }),
  });
};
