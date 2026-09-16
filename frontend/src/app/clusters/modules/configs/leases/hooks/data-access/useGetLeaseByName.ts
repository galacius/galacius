import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_LEASE_DETAIL } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { Lease } from "../../api/resources";
import { GetLeaseByName } from "../../api/resources";
import { useLeasesUpdateEvents } from "../async-events/useLeasesUpdateEvents";

export const useGetLeaseByName = (context: string, namespace: string, name: string) => {
  const latestLeases = useLeasesUpdateEvents();

  const query = useQuery<Lease, Error>({
    queryKey: [QUERY_KEY_LEASE_DETAIL, { context, namespace, name }],
    queryFn: () => GetLeaseByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    const matchedLease = latestLeases.find((l) => l.Namespace === namespace && l.Name === name);
    if (matchedLease) return matchedLease;
    return query.data;
  }, [latestLeases, query.data, namespace, name]);

  return {
    ...query,
    data: mergedData,
  };
};
