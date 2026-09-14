import { useQuery } from "@tanstack/react-query";
import { IsMarketplaceEnabled } from "@wailsjs/go/app/App";

export const useIsMarketplaceEnabled = (): boolean => {
  const { data = false } = useQuery({
    queryKey: ["is-marketplace-enabled"],
    queryFn: IsMarketplaceEnabled,
    staleTime: Infinity,
  });
  return data;
};
