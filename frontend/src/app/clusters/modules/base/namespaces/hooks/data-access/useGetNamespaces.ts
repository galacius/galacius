import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_NAMESPACES } from "../../api/api.const";
import type { Namespace } from "../../api/resources";
import { ListNamespaces } from "../../api/resources";
import { useNamespacesUpdateEvents } from "../async-events/useNamespacesUpdateEvents";

export const useGetNamespaces = (context: string, callback?: UseQueryCallback<Namespace[]>) => {
  const latestNamespaces = useNamespacesUpdateEvents();

  const query = useQuery<Namespace[], Error>({
    queryKey: [QUERY_KEY_NAMESPACES, context],
    queryFn: () => ListNamespaces(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Merge event-driven data locally: prefer event namespaces over fetched data if available.
  const mergedData = useMemo(() => {
    let baseData = query.data;
    if (latestNamespaces.length) baseData = latestNamespaces;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestNamespaces, query.data, callback]);

  return {
    ...query,
    data: mergedData,
  };
};
