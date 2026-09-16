export {
  DownloadPodLogs,
  ExecInPod,
  GetPodByName,
  GetPodsSummary,
  GetPodYAML,
  ListPods,
  ResizeExecTerminal,
  StopExec,
  StopLogs,
  StreamLogs,
  UnwatchPodDetail,
  UpdatePodYAML,
  WatchPodDetail,
} from "@wailsjs/go/app/App";

export type {
  PodCondition,
  PodContainerPort,
  PodContainerMount,
  PodContainerLastStatus,
  PodContainerDetail,
  PodVolumeSource,
  PodVolume,
  TolerationDetail,
  Pod,
  PodSummary,
} from "@galacius/core";
