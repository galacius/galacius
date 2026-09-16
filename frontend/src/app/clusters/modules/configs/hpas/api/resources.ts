export {
  GetHPAByName,
  GetHPAYAML,
  ListHPAs,
  UnwatchHPADetail,
  UpdateHPAYAML,
  WatchHPADetail,
} from "@wailsjs/go/app/App";

export type { HPA, HPAMetric, ScaleTargetRef, HPADetail } from "@galacius/core";
