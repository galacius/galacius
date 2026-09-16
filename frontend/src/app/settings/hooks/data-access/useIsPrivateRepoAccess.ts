import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { IsPrivateRepoAccess } from "@wailsjs/go/app/App";
import { QUERY_KEY_IS_PRIVATE_REPO_ACCESS } from "../../api/api.const";
import type { UseQueryCallback } from "@galacius/core";

export const useIsPrivateRepoAccess = (callback?: UseQueryCallback<boolean>) => {
  return useQuery<boolean, Error>({
    queryKey: [QUERY_KEY_IS_PRIVATE_REPO_ACCESS],
    queryFn: () => IsPrivateRepoAccess(),
    ...DEFAULT_QUERY_OPTIONS,
    select: callback?.select,
  });
};
