import { useQuery } from "@tanstack/react-query";
import { GetInstallSource } from "@wailsjs/go/app/App";
import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";
import { QUERY_KEY_INSTALL_SOURCE } from "../../api/api.const";

export const useGetInstallSource = () => {
  return useQuery<string, Error>({
    queryKey: [QUERY_KEY_INSTALL_SOURCE],
    queryFn: () => GetInstallSource(),
    ...DEFAULT_QUERY_OPTIONS,
  });
};
