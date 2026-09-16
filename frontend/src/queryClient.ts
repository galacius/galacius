import { QueryClient } from "@tanstack/react-query";

// Single shared instance — extracted out of main.tsx so expose/index.tsx can
// expose it to plugins via appWideAPI.getQueryClient() without creating a
// second client.
export const queryClient = new QueryClient();
