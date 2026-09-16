import { BrowserOpenURL } from "@wailsjs/runtime/runtime";
import { useCallback } from "react";

export const useOpenBrowserURL = () => {
  return useCallback((url: string) => {
    BrowserOpenURL(url);
  }, []);
};
