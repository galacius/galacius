import { useQuery } from "@tanstack/react-query";
import { Environment } from "@wailsjs/runtime/runtime";
import { DEFAULT_QUERY_OPTIONS } from "../../../shared/api/api";

// Matches the Go GOOS keys used in Manifest.os ("linux" | "darwin" | "windows").
export const useGetHostPlatform = () => {
  return useQuery<string, Error>({
    queryKey: ["host-platform"],
    queryFn: async () => (await Environment()).platform,
    ...DEFAULT_QUERY_OPTIONS,
  });
};
