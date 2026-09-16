import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { GetDefaultShell } from "@wailsjs/go/app/App";
import { QUERY_KEY_DEFAULT_SHELL } from "../../api/api.const";

export const useGetDefaultShell = () => {
  return useQuery<string, Error>({
    queryKey: [QUERY_KEY_DEFAULT_SHELL],
    queryFn: () => GetDefaultShell(),
    ...DEFAULT_QUERY_OPTIONS,
  });
};
