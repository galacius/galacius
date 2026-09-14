export {
  GetPersistentVolumeByName,
  GetPersistentVolumeYAML,
  ListPersistentVolumes,
  UnwatchPersistentVolumeDetail,
  UpdatePersistentVolumeYAML,
  WatchPersistentVolumeDetail,
} from "@wailsjs/go/app/App";

export type { PersistentVolume, PersistentVolumeDetail } from "@galacius/core";
