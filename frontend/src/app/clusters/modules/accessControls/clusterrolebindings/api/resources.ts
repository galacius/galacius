export {
  GetClusterRoleBindingByName,
  GetClusterRoleBindingYAML,
  ListClusterRoleBindings,
  UnwatchClusterRoleBindingDetail,
  UpdateClusterRoleBindingYAML,
  WatchClusterRoleBindingDetail,
} from "@wailsjs/go/app/App";

export type { CRBSubject, ClusterRoleBinding } from "@galacius/core";
