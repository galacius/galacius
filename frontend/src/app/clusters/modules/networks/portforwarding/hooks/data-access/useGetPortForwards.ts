import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EventsOn } from "@wailsjs/runtime/runtime";
import { QUERY_KEY_PORT_FORWARDS } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { UseQueryCallback } from "@galacius/core";
import { ListPortForwards } from "../../api/resources";
import type { PortForward } from "../../api/resources";

export const useGetPortForwards = (
  input: { context: string },
  callback?: UseQueryCallback<PortForward[]>
) => {
  const queryClient = useQueryClient();
  const { context } = input;

  useEffect(() => {
    const unsub = EventsOn("portforwards:update", (all: PortForward[]) => {
      queryClient.setQueryData([QUERY_KEY_PORT_FORWARDS, { context }], all);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [context, queryClient]);

  return useQuery<PortForward[], Error>({
    queryKey: [QUERY_KEY_PORT_FORWARDS, input],
    queryFn: () => ListPortForwards() as Promise<PortForward[]>,
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!input.context,
    select: callback?.select,
  });
};
