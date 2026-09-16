import { useQuery } from "@tanstack/react-query";
import { GetSettings } from "@wailsjs/go/app/App";
import type { config } from "@wailsjs/go/models";
import { QUERY_KEY_SETTINGS } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";
import type { UseQueryCallback } from "@galacius/core";

export const useGetSettings = (callback?: UseQueryCallback<config.Settings>) => {
  return useQuery<config.Settings, Error>({
    queryKey: [QUERY_KEY_SETTINGS],
    queryFn: () => GetSettings(),
    ...DEFAULT_QUERY_OPTIONS,
    select: callback?.select,
  });
};
