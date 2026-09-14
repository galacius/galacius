export {
  GetDeploymentByName,
  GetDeploymentYAML,
  GetDeploymentsSummary,
  ListDeployments,
  UnwatchDeploymentDetail,
  UpdateDeploymentYAML,
  WatchDeploymentDetail,
} from "@wailsjs/go/app/App";

export type { DeploymentCondition, Deployment, DeploymentSummary } from "@galacius/core";
