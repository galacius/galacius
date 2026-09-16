import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_PDB_DETAIL } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { PodDisruptionBudgetDetail } from "../../api/resources";
import { GetPodDisruptionBudgetByName } from "../../api/resources";
import { usePodDisruptionBudgetUpdateEvents } from "../async-events/usePodDisruptionBudgetUpdateEvents";

export const useGetPodDisruptionBudgetDetail = (
  context: string,
  namespace: string,
  name: string
) => {
  const latestPDB = usePodDisruptionBudgetUpdateEvents(namespace, name);

  const query = useQuery<PodDisruptionBudgetDetail, Error>({
    queryKey: [QUERY_KEY_PDB_DETAIL, { context, namespace, name }],
    queryFn: () => GetPodDisruptionBudgetByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestPDB) return latestPDB;
    return query.data;
  }, [latestPDB, query.data]);

  return { ...query, data: mergedData };
};
