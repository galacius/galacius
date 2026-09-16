import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_EVENT_DETAIL } from "../../api/api.const";
import type { Event } from "../../api/resources";
import { GetEventByName } from "../../api/resources";
import { useEventDetailUpdateEvents } from "../async-events/useEventDetailUpdateEvents";

export const useGetEventDetail = (context: string, namespace: string, name: string) => {
  // Scoped "event:update" pushes for this one Event — see useEventDetailUpdateEvents.
  const latestEvent = useEventDetailUpdateEvents(namespace, name);

  const query = useQuery<Event, Error>({
    queryKey: [QUERY_KEY_EVENT_DETAIL, { context, namespace, name }],
    queryFn: () => GetEventByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestEvent) return latestEvent;
    return query.data;
  }, [latestEvent, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
