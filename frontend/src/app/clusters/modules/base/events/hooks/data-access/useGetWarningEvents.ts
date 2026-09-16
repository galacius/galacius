import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_WARNING_EVENTS } from "../../api/api.const";
import type { Event } from "../../api/resources";
import { ListWarningEvents } from "../../api/resources";
import { useWarningEventsUpdateEvents } from "../async-events/useWarningEventsUpdateEvents";

export const useGetWarningEvents = (input: { context: string; namespaces: string[] }) => {
  const { context, namespaces } = input;
  const triggerRefresh = useWarningEventsUpdateEvents();

  return useQuery<Event[], Error>({
    queryKey: [QUERY_KEY_WARNING_EVENTS, { context, namespaces }, triggerRefresh],
    queryFn: () =>
      ListWarningEvents().then((events) => events.toSorted((a, b) => b.CreatedAt - a.CreatedAt)),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });
};
