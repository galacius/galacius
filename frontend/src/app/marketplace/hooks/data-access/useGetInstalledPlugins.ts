import { useQuery } from "@tanstack/react-query";
import { GetInstalledPlugins } from "@wailsjs/go/app/App";
import { useMemo } from "react";
import type { dto } from "@wailsjs/go/models";

interface UseGetInstalledPluginsResult {
  pluginStatuses: dto.InstalledPlugin[];
  readyPlugins: dto.InstalledPlugin[];
  isLoading: boolean;
}

export const useGetInstalledPlugins = (): UseGetInstalledPluginsResult => {
  const { data: pluginStatuses = [], isLoading } = useQuery({
    queryKey: ["installed-plugins"],
    queryFn: () => GetInstalledPlugins(),
    staleTime: 5000,
    refetchInterval: 5000,
  });

  const readyPlugins = useMemo(
    () => pluginStatuses.filter((s) => s.status === "READY"),
    [pluginStatuses]
  );

  return {
    pluginStatuses,
    readyPlugins,
    isLoading,
  };
};
