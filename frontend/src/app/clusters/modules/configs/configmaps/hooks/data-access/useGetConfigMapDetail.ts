import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_CONFIGMAP_DETAIL } from "../../api/api.const";
import type { ConfigMap } from "../../api/resources";
import { GetConfigMapByName } from "../../api/resources";
import { useConfigMapDetailUpdateEvents } from "../async-events/useConfigMapDetailUpdateEvents";

export const useGetConfigMapDetail = (context: string, namespace: string, name: string) => {
  // Scoped "configmap:update" pushes for this one ConfigMap — see useConfigMapDetailUpdateEvents.
  const latestConfigMap = useConfigMapDetailUpdateEvents(namespace, name);

  const query = useQuery<ConfigMap, Error>({
    queryKey: [QUERY_KEY_CONFIGMAP_DETAIL, { context, namespace, name }],
    queryFn: () => GetConfigMapByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestConfigMap) return latestConfigMap;
    return query.data;
  }, [latestConfigMap, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
