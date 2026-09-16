import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_HPA_DETAIL } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { HPADetail } from "../../api/resources";
import { GetHPAByName } from "../../api/resources";
import { useHPAUpdateEvents } from "../async-events/useHPAUpdateEvents";

export const useGetHPADetail = (context: string, namespace: string, name: string) => {
  const latestHPA = useHPAUpdateEvents(namespace, name);

  const query = useQuery<HPADetail, Error>({
    queryKey: [QUERY_KEY_HPA_DETAIL, { context, namespace, name }],
    queryFn: () => GetHPAByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestHPA) return latestHPA;
    return query.data;
  }, [latestHPA, query.data]);

  return { ...query, data: mergedData };
};
