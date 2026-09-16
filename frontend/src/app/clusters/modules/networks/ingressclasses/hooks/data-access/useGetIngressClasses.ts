import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_INGRESSCLASSES } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { UseQueryCallback } from "@galacius/core";
import { ListIngressClasses } from "../../api/resources";
import type { IngressClass } from "../../api/resources";
import { useIngressClassesUpdateEvents } from "../async-events/useIngressClassesUpdateEvents";

export const useGetIngressClasses = (
  context: string,
  callback?: UseQueryCallback<IngressClass[]>
) => {
  const latestIngressClasses = useIngressClassesUpdateEvents();
  const query = useQuery<IngressClass[], Error>({
    queryKey: [QUERY_KEY_INGRESSCLASSES, context],
    queryFn: () => ListIngressClasses(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  const mergedData = useMemo(() => {
    let baseData = query.data;
    if (latestIngressClasses.length) baseData = latestIngressClasses;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestIngressClasses, query.data, callback]);

  return { ...query, data: mergedData };
};
