import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_ROLE_BINDING_DETAIL } from "../../api/api.const";
import type { RoleBinding } from "../../api/resources";
import { GetRoleBindingByName } from "../../api/resources";
import { useRoleBindingDetailUpdateEvents } from "../async-events/useRoleBindingDetailUpdateEvents";

export const useGetRoleBindingDetail = (context: string, namespace: string, name: string) => {
  // Scoped "rolebinding:update" pushes for this one RoleBinding — see useRoleBindingDetailUpdateEvents.
  const latestRoleBinding = useRoleBindingDetailUpdateEvents(namespace, name);

  const query = useQuery<RoleBinding, Error>({
    queryKey: [QUERY_KEY_ROLE_BINDING_DETAIL, { context, namespace, name }],
    queryFn: () => GetRoleBindingByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestRoleBinding) return latestRoleBinding;
    return query.data;
  }, [latestRoleBinding, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
