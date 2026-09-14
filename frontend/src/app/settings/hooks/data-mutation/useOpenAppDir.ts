import { useMutation } from "@tanstack/react-query";
import { OpenAppDir } from "@wailsjs/go/app/App";

export const useOpenAppDir = () => {
  return useMutation({
    mutationFn: () => OpenAppDir(),
  });
};
