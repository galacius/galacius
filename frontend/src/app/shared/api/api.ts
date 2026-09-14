import { keepPreviousData } from "@tanstack/react-query";

export const DEFAULT_QUERY_OPTIONS = {
  refetchOnWindowFocus: false,
  retry: false,
  placeholderData: keepPreviousData,
} as const;
