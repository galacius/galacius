import { LoadingSpinner } from "@galacius/design-system";
import { FC, lazy, Suspense } from "react";
import { useDetailDrawerContext } from "./DetailDrawerContext";

const ConfigMapDetailDrawer = lazy(() =>
  import("../../../modules/configs/configmaps/components/ConfigMapDetailDrawer").then((m) => ({
    default: m.ConfigMapDetailDrawer,
  }))
);
const SecretDetailDrawer = lazy(() =>
  import("../../../modules/configs/secrets/components/SecretDetailDrawer").then((m) => ({
    default: m.SecretDetailDrawer,
  }))
);
const ResourceQuotaDetailDrawer = lazy(() =>
  import("../../../modules/configs/resourcequotas/components/ResourceQuotaDetailDrawer").then(
    (m) => ({ default: m.ResourceQuotaDetailDrawer })
  )
);
const LimitRangeDetailDrawer = lazy(() =>
  import("../../../modules/configs/limitranges/components/LimitRangeDetailDrawer").then((m) => ({
    default: m.LimitRangeDetailDrawer,
  }))
);
const PersistentVolumeClaimDetailDrawer = lazy(() =>
  import("../../../modules/storages/pvcs/components/PersistentVolumeClaimDetailDrawer").then(
    (m) => ({ default: m.PersistentVolumeClaimDetailDrawer })
  )
);
const PersistentVolumeDetailDrawer = lazy(() =>
  import("../../../modules/storages/pvs/components/PersistentVolumeDetailDrawer").then((m) => ({
    default: m.PersistentVolumeDetailDrawer,
  }))
);
const StorageClassDetailDrawer = lazy(() =>
  import("../../../modules/storages/storageclasses/components/StorageClassDetailDrawer").then(
    (m) => ({ default: m.StorageClassDetailDrawer })
  )
);

export const ConfigStorageDetailDrawers: FC = () => {
  const {
    selectedConfigMapName,
    selectedConfigMapNamespace,
    onToggleConfigMapDetail,

    selectedSecretName,
    selectedSecretNamespace,
    onToggleSecretDetail,

    selectedResourceQuotaName,
    selectedResourceQuotaNamespace,
    onToggleResourceQuotaDetail,

    selectedLimitRangeName,
    selectedLimitRangeNamespace,
    onToggleLimitRangeDetail,

    selectedPersistentVolumeClaimName,
    selectedPersistentVolumeClaimNamespace,
    onTogglePersistentVolumeClaimDetail,

    selectedPersistentVolumeName,
    onTogglePersistentVolumeDetail,

    selectedStorageClassName,
    onToggleStorageClassDetail,
  } = useDetailDrawerContext((v) => ({
    selectedConfigMapName: v.selectedConfigMapName,
    selectedConfigMapNamespace: v.selectedConfigMapNamespace,
    onToggleConfigMapDetail: v.onToggleConfigMapDetail,

    selectedSecretName: v.selectedSecretName,
    selectedSecretNamespace: v.selectedSecretNamespace,
    onToggleSecretDetail: v.onToggleSecretDetail,

    selectedResourceQuotaName: v.selectedResourceQuotaName,
    selectedResourceQuotaNamespace: v.selectedResourceQuotaNamespace,
    onToggleResourceQuotaDetail: v.onToggleResourceQuotaDetail,

    selectedLimitRangeName: v.selectedLimitRangeName,
    selectedLimitRangeNamespace: v.selectedLimitRangeNamespace,
    onToggleLimitRangeDetail: v.onToggleLimitRangeDetail,

    selectedPersistentVolumeClaimName: v.selectedPersistentVolumeClaimName,
    selectedPersistentVolumeClaimNamespace: v.selectedPersistentVolumeClaimNamespace,
    onTogglePersistentVolumeClaimDetail: v.onTogglePersistentVolumeClaimDetail,

    selectedPersistentVolumeName: v.selectedPersistentVolumeName,
    onTogglePersistentVolumeDetail: v.onTogglePersistentVolumeDetail,

    selectedStorageClassName: v.selectedStorageClassName,
    onToggleStorageClassDetail: v.onToggleStorageClassDetail,
  }));

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <ConfigMapDetailDrawer
          cmName={selectedConfigMapName}
          cmNamespace={selectedConfigMapNamespace}
          open={!!selectedConfigMapName && !!selectedConfigMapNamespace}
          onClose={onToggleConfigMapDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <SecretDetailDrawer
          secretName={selectedSecretName}
          secretNamespace={selectedSecretNamespace}
          open={!!selectedSecretName && !!selectedSecretNamespace}
          onClose={onToggleSecretDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <ResourceQuotaDetailDrawer
          rqName={selectedResourceQuotaName}
          rqNamespace={selectedResourceQuotaNamespace}
          open={!!selectedResourceQuotaName}
          onClose={onToggleResourceQuotaDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <LimitRangeDetailDrawer
          lrName={selectedLimitRangeName}
          lrNamespace={selectedLimitRangeNamespace}
          open={!!selectedLimitRangeName && !!selectedLimitRangeNamespace}
          onClose={onToggleLimitRangeDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <PersistentVolumeClaimDetailDrawer
          pvcName={selectedPersistentVolumeClaimName}
          pvcNamespace={selectedPersistentVolumeClaimNamespace}
          open={!!selectedPersistentVolumeClaimName && !!selectedPersistentVolumeClaimNamespace}
          onClose={onTogglePersistentVolumeClaimDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <PersistentVolumeDetailDrawer
          name={selectedPersistentVolumeName}
          open={!!selectedPersistentVolumeName}
          onClose={onTogglePersistentVolumeDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <StorageClassDetailDrawer
          name={selectedStorageClassName}
          open={!!selectedStorageClassName}
          onClose={onToggleStorageClassDetail}
        />
      </Suspense>
    </>
  );
};
