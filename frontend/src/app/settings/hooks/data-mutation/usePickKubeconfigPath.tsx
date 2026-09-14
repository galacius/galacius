import { useMutation } from "@tanstack/react-query";
import { PickKubeconfigPath } from "@wailsjs/go/app/App";

export const usePickKubeconfigPath = () => {
  return useMutation({
    mutationFn: () => PickKubeconfigPath(),
  });
};
