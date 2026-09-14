export {
  GetDaemonSetByName,
  GetDaemonSetYAML,
  GetDaemonSetsSummary,
  ListDaemonSets,
  UnwatchDaemonSetDetail,
  UpdateDaemonSetYAML,
  WatchDaemonSetDetail,
} from "@wailsjs/go/app/App";

export type { DaemonSet, DaemonSetSummary } from "@galacius/core";
