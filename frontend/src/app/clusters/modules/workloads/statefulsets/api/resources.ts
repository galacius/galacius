export {
  GetStatefulSetByName,
  GetStatefulSetYAML,
  GetStatefulSetsSummary,
  ListStatefulSets,
  UnwatchStatefulSetDetail,
  UpdateStatefulSetYAML,
  WatchStatefulSetDetail,
} from "@wailsjs/go/app/App";

export type { StatefulSet, StatefulSetSummary } from "@galacius/core";
