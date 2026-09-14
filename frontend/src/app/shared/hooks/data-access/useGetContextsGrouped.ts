import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { GetContextsGrouped } from "@wailsjs/go/app/App";
import { dto } from "@wailsjs/go/models";
import { QUERY_KEY_CONTEXTS_GROUPED } from "../../../shared/api/api.const";

export const useGetContextsGrouped = () => {
  return useQuery<dto.KubeconfigGroup[], Error>({
    queryKey: [QUERY_KEY_CONTEXTS_GROUPED],
    queryFn: async () => GetContextsGrouped(),
    ...DEFAULT_QUERY_OPTIONS,
  });
};
