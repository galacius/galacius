import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateJobYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_JOBS, QUERY_KEY_JOB_YAML } from "../../api/api.const";

export const useUpdateJobYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateJobYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_JOBS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_JOB_YAML] });
      renderSuccessToast({ title: "Job updated", description: "Job updated successfully" });
    },
    onError: (err) => renderErrorToast({ title: "Failed to update Job", description: String(err) }),
  });
};
