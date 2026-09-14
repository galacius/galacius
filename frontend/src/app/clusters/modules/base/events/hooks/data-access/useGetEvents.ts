import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_EVENTS } from "../../api/api.const";
import type { Event } from "../../api/resources";
import { ListEvents } from "../../api/resources";
import { useEventsUpdateEvents } from "../async-events/useEventsUpdateEvents";

export const useGetEvents = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<Event[]>
) => {
  const { context, namespaces } = input;
  const latestEvents = useEventsUpdateEvents();

  const query = useQuery<Event[], Error>({
    queryKey: [QUERY_KEY_EVENTS, { context, namespaces }],
    queryFn: () => ListEvents(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestEvents.length ? latestEvents : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestEvents, query.data, callback]);

  const isLoading = latestEvents.length === 0 && query.isLoading;

  return { ...query, data: mergedData, isLoading };
};
