export {
  GetPersistentVolumeClaimByName,
  GetPersistentVolumeClaimYAML,
  ListPersistentVolumeClaims,
  UnwatchPersistentVolumeClaimDetail,
  UpdatePersistentVolumeClaimYAML,
  WatchPersistentVolumeClaimDetail,
} from "@wailsjs/go/app/App";

export type { PersistentVolumeClaim, PersistentVolumeClaimDetail } from "@galacius/core";
