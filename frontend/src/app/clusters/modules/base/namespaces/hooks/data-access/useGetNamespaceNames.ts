import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { QUERY_KEY_NAMESPACE_NAMES } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { UseQueryCallback } from "@galacius/core";
import { GetNamespaces } from "../../api/resources";
import type { Namespace } from "../../api/resources";

export const useGetNamespaceNames = (context: string, callback?: UseQueryCallback<string[]>) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = EventsOn("namespaces:update", (allNs: Namespace[]) => {
      queryClient.setQueryData(
        [QUERY_KEY_NAMESPACE_NAMES, context],
        allNs.map((ns) => ns.Name)
      );
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [context, queryClient]);

  return useQuery<string[], Error>({
    queryKey: [QUERY_KEY_NAMESPACE_NAMES, context],
    queryFn: () => GetNamespaces(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
    select: callback?.select,
  });
};
