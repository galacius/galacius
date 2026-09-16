import { LoadingSpinner } from "@galacius/design-system";
import { FC, lazy, Suspense } from "react";
import { useDetailDrawerContext } from "./DetailDrawerContext";

const ClusterRoleBindingDetailDrawer = lazy(() =>
  import("../../../modules/accessControls/clusterrolebindings/components/ClusterRoleBindingDetailDrawer").then(
    (m) => ({ default: m.ClusterRoleBindingDetailDrawer })
  )
);
const ClusterRoleDetailDrawer = lazy(() =>
  import("../../../modules/accessControls/clusterroles/components/ClusterRoleDetailDrawer").then(
    (m) => ({ default: m.ClusterRoleDetailDrawer })
  )
);
const RoleBindingDetailDrawer = lazy(() =>
  import("../../../modules/accessControls/rolebindings/components/RoleBindingDetailDrawer").then(
    (m) => ({ default: m.RoleBindingDetailDrawer })
  )
);
const RoleDetailDrawer = lazy(() =>
  import("../../../modules/accessControls/roles/components/RoleDetailDrawer").then((m) => ({
    default: m.RoleDetailDrawer,
  }))
);
const ServiceAccountDetailDrawer = lazy(() =>
  import("../../../modules/accessControls/serviceaccounts/components/ServiceAccountDetailDrawer").then(
    (m) => ({ default: m.ServiceAccountDetailDrawer })
  )
);

export const RbacDetailDrawers: FC = () => {
  const {
    selectedClusterRoleName,
    onToggleClusterRoleDetail,

    selectedClusterRoleBindingName,
    onToggleClusterRoleBindingDetail,

    selectedRoleName,
    selectedRoleNamespace,
    onToggleRoleDetail,

    selectedRoleBindingName,
    selectedRoleBindingNamespace,
    onToggleRoleBindingDetail,

    selectedServiceAccountName,
    selectedServiceAccountNamespace,
    onToggleServiceAccountDetail,
  } = useDetailDrawerContext((v) => ({
    selectedClusterRoleName: v.selectedClusterRoleName,
    onToggleClusterRoleDetail: v.onToggleClusterRoleDetail,

    selectedClusterRoleBindingName: v.selectedClusterRoleBindingName,
    onToggleClusterRoleBindingDetail: v.onToggleClusterRoleBindingDetail,

    selectedRoleName: v.selectedRoleName,
    selectedRoleNamespace: v.selectedRoleNamespace,
    onToggleRoleDetail: v.onToggleRoleDetail,

    selectedRoleBindingName: v.selectedRoleBindingName,
    selectedRoleBindingNamespace: v.selectedRoleBindingNamespace,
    onToggleRoleBindingDetail: v.onToggleRoleBindingDetail,

    selectedServiceAccountName: v.selectedServiceAccountName,
    selectedServiceAccountNamespace: v.selectedServiceAccountNamespace,
    onToggleServiceAccountDetail: v.onToggleServiceAccountDetail,
  }));

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <ClusterRoleDetailDrawer
          clusterRoleName={selectedClusterRoleName}
          open={!!selectedClusterRoleName}
          onClose={onToggleClusterRoleDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <ClusterRoleBindingDetailDrawer
          clusterRoleBindingName={selectedClusterRoleBindingName}
          open={!!selectedClusterRoleBindingName}
          onClose={onToggleClusterRoleBindingDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <RoleDetailDrawer
          roleName={selectedRoleName}
          roleNamespace={selectedRoleNamespace}
          open={!!selectedRoleName && !!selectedRoleNamespace}
          onClose={onToggleRoleDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <RoleBindingDetailDrawer
          roleBindingName={selectedRoleBindingName}
          roleBindingNamespace={selectedRoleBindingNamespace}
          open={!!selectedRoleBindingName && !!selectedRoleBindingNamespace}
          onClose={onToggleRoleBindingDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <ServiceAccountDetailDrawer
          saName={selectedServiceAccountName}
          saNamespace={selectedServiceAccountNamespace}
          open={!!selectedServiceAccountName}
          onClose={onToggleServiceAccountDetail}
        />
      </Suspense>
    </>
  );
};
