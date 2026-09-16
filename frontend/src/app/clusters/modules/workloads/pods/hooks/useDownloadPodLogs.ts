import { renderErrorToast } from "@galacius/design-system";
import { useMutation } from "@tanstack/react-query";
import { DownloadPodLogs } from "../api/resources";

interface DownloadPodLogsVariables {
  contextName: string;
  ns: string;
  pod: string;
  container: string;
  previous?: boolean;
}

export const useDownloadPodLogs = () =>
  useMutation({
    mutationFn: ({ contextName, ns, pod, container, previous }: DownloadPodLogsVariables) =>
      DownloadPodLogs(contextName, ns, pod, container, previous ?? false),
    onError: (err) => {
      renderErrorToast({ title: "Failed to download logs", description: String(err) });
    },
  });
