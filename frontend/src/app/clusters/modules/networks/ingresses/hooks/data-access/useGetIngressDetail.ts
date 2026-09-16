import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_INGRESS_DETAIL } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { IngressDetail } from "../../api/resources";
import { GetIngressByName } from "../../api/resources";
import { useIngressUpdateEvents } from "../async-events/useIngressUpdateEvents";

export const useGetIngressDetail = (context: string, namespace: string, name: string) => {
  const latestIngress = useIngressUpdateEvents(namespace, name);

  const query = useQuery<IngressDetail, Error>({
    queryKey: [QUERY_KEY_INGRESS_DETAIL, { context, namespace, name }],
    queryFn: () => GetIngressByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestIngress) return latestIngress;
    return query.data;
  }, [latestIngress, query.data]);

  return { ...query, data: mergedData };
};
