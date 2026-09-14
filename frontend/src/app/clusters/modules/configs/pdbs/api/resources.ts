export {
  GetPDBYAML,
  GetPodDisruptionBudgetByName,
  ListPodDisruptionBudgets,
  UnwatchPodDisruptionBudgetDetail,
  UpdatePDBYAML,
  WatchPodDisruptionBudgetDetail,
} from "@wailsjs/go/app/App";

export type { PodDisruptionBudget, PodDisruptionBudgetDetail } from "@galacius/core";
