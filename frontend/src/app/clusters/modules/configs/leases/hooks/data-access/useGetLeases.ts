import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_LEASES } from "../../api/api.const";
import type { Lease } from "../../api/resources";
import { ListLeases } from "../../api/resources";
import { useLeasesUpdateEvents } from "../async-events/useLeasesUpdateEvents";

export const useGetLeases = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<Lease[]>
) => {
  const { context, namespaces } = input;
  const latestLeases = useLeasesUpdateEvents();

  const query = useQuery<Lease[], Error>({
    queryKey: [QUERY_KEY_LEASES, { context, namespaces }],
    queryFn: () => ListLeases(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestLeases.length ? latestLeases : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestLeases, query.data, callback]);

  const isLoading = latestLeases.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
