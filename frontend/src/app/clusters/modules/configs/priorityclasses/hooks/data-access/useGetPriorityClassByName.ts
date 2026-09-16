import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_PRIORITY_CLASS_DETAIL } from "../../api/api.const";
import type { PriorityClass } from "../../api/resources";
import { GetPriorityClassByName } from "../../api/resources";
import { usePriorityClassesUpdateEvents } from "../async-events/usePriorityClassesUpdateEvents";

export const useGetPriorityClassByName = (context: string, name: string) => {
  const latestPriorityClasses = usePriorityClassesUpdateEvents();

  const query = useQuery<PriorityClass, Error>({
    queryKey: [QUERY_KEY_PRIORITY_CLASS_DETAIL, { context, name }],
    queryFn: () => GetPriorityClassByName(name!),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name,
  });

  // Merge event-driven data: prefer matched priority class from latest event if available.
  const mergedData = useMemo(() => {
    const matchedPc = latestPriorityClasses.find((pc) => pc.Name === name);
    if (matchedPc) return matchedPc;
    return query.data;
  }, [latestPriorityClasses, query.data, name]);

  return {
    ...query,
    data: mergedData,
  };
};
