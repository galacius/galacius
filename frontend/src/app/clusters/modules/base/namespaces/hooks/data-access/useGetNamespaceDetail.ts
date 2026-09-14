import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_NAMESPACE_DETAIL } from "../../api/api.const";
import type { Namespace } from "../../api/resources";
import { GetNamespaceByName } from "../../api/resources";
import { useNamespaceDetailUpdateEvents } from "../async-events/useNamespaceDetailUpdateEvents";

export const useGetNamespaceDetail = (context: string, name: string) => {
  // Scoped "namespace:update" pushes for this one Namespace — see useNamespaceDetailUpdateEvents.
  const latestNamespace = useNamespaceDetailUpdateEvents(name);

  const query = useQuery<Namespace, Error>({
    queryKey: [QUERY_KEY_NAMESPACE_DETAIL, { context, name }],
    queryFn: () => GetNamespaceByName(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestNamespace) return latestNamespace;
    return query.data;
  }, [latestNamespace, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
