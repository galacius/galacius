import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateCronJobYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_CRONJOBS, QUERY_KEY_CRONJOB_YAML } from "../../api/api.const";

export const useUpdateCronJobYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateCronJobYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CRONJOBS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CRONJOB_YAML] });
      renderSuccessToast({ title: "CronJob updated", description: "CronJob updated successfully" });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update CronJob", description: String(err) }),
  });
};
