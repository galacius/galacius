import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_PRIORITY_CLASSES } from "../../api/api.const";
import type { PriorityClass } from "../../api/resources";
import { ListPriorityClasses } from "../../api/resources";
import { usePriorityClassesUpdateEvents } from "../async-events/usePriorityClassesUpdateEvents";

export const useGetPriorityClasses = (
  context: string,
  callback?: UseQueryCallback<PriorityClass[]>
) => {
  const latestPriorityClasses = usePriorityClassesUpdateEvents();

  const query = useQuery<PriorityClass[], Error>({
    queryKey: [QUERY_KEY_PRIORITY_CLASSES, context],
    queryFn: () => ListPriorityClasses(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Merge event-driven data locally: prefer event priority classes over fetched data if available.
  const mergedData = useMemo(() => {
    let baseData = query.data;
    if (latestPriorityClasses.length) baseData = latestPriorityClasses;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestPriorityClasses, query.data, callback]);

  return {
    ...query,
    data: mergedData,
  };
};
