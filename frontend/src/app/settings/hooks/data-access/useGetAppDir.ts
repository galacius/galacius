import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { GetAppDir } from "@wailsjs/go/app/App";
import { QUERY_KEY_APP_DIR } from "../../api/api.const";

export const useGetAppDir = () => {
  return useQuery<string, Error>({
    queryKey: [QUERY_KEY_APP_DIR],
    queryFn: () => GetAppDir(),
    ...DEFAULT_QUERY_OPTIONS,
  });
};
