import { useMutation } from "@tanstack/react-query";
import { PerformUpdate } from "@wailsjs/go/app/App";

export const usePerformUpdateApp = () => {
  return useMutation({
    mutationFn: (latestVersion: string) => PerformUpdate(latestVersion),
  });
};
