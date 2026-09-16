import { useQuery } from "@tanstack/react-query";
import { GetVersion } from "@wailsjs/go/app/App";
import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";
import { QUERY_KEY_VERSION } from "../../api/api.const";

export const useGetVersion = () => {
  return useQuery<string, Error>({
    queryKey: [QUERY_KEY_VERSION],
    queryFn: () => GetVersion(),
    ...DEFAULT_QUERY_OPTIONS,
  });
};
