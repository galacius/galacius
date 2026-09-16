import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_INGRESSCLASS_DETAIL } from "../../api/api.const";
import type { IngressClass } from "../../api/resources";
import { GetIngressClassByName } from "../../api/resources";
import { useIngressClassDetailUpdateEvents } from "../async-events/useIngressClassDetailUpdateEvents";

export const useGetIngressClassDetail = (context: string, name: string) => {
  // Scoped "ingressclass:update" pushes for this one IngressClass — see useIngressClassDetailUpdateEvents.
  const latestIngressClass = useIngressClassDetailUpdateEvents(name);

  const query = useQuery<IngressClass, Error>({
    queryKey: [QUERY_KEY_INGRESSCLASS_DETAIL, { context, name }],
    queryFn: () => GetIngressClassByName(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestIngressClass) return latestIngressClass;
    return query.data;
  }, [latestIngressClass, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
