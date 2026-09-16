import { LoadingSpinner } from "@galacius/design-system";
import { FC, lazy, Suspense } from "react";
import { useDetailDrawerContext } from "./DetailDrawerContext";

const NamespaceDetailDrawer = lazy(() =>
  import("../../../modules/base/namespaces/components/NamespaceDetailDrawer").then((m) => ({
    default: m.NamespaceDetailDrawer,
  }))
);
const NodeDetailDrawer = lazy(() =>
  import("../../../modules/base/nodes/components/NodeDetailDrawer").then((m) => ({
    default: m.NodeDetailDrawer,
  }))
);
const EventDetailDrawer = lazy(() =>
  import("../../../modules/base/events/components/EventDetailDrawer").then((m) => ({
    default: m.EventDetailDrawer,
  }))
);
const LeaseDetailDrawer = lazy(() =>
  import("../../../modules/configs/leases/components/LeaseDetailDrawer").then((m) => ({
    default: m.LeaseDetailDrawer,
  }))
);
const PriorityClassDetailDrawer = lazy(() =>
  import("../../../modules/configs/priorityclasses/components/PriorityClassDetailDrawer").then(
    (m) => ({ default: m.PriorityClassDetailDrawer })
  )
);

export const ClusterDetailDrawers: FC = () => {
  const {
    selectedNamespaceName,
    onToggleNamespaceDetail,

    selectedNodeName,
    onToggleNodeDetail,

    selectedEventName,
    selectedEventNamespace,
    onToggleEventDetail,

    selectedLeaseName,
    selectedLeaseNamespace,
    onToggleLease,

    selectedPriorityClassName,
    onTogglePriorityClass,
  } = useDetailDrawerContext((v) => ({
    selectedNamespaceName: v.selectedNamespaceName,
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,

    selectedNodeName: v.selectedNodeName,
    onToggleNodeDetail: v.onToggleNodeDetail,

    selectedEventName: v.selectedEventName,
    selectedEventNamespace: v.selectedEventNamespace,
    onToggleEventDetail: v.onToggleEventDetail,

    selectedLeaseName: v.selectedLeaseName,
    selectedLeaseNamespace: v.selectedLeaseNamespace,
    onToggleLease: v.onToggleLease,

    selectedPriorityClassName: v.selectedPriorityClassName,
    onTogglePriorityClass: v.onTogglePriorityClass,
  }));

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <NamespaceDetailDrawer
          namespaceName={selectedNamespaceName}
          open={!!selectedNamespaceName}
          onClose={onToggleNamespaceDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <NodeDetailDrawer
          nodeName={selectedNodeName}
          open={!!selectedNodeName}
          onClose={onToggleNodeDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <EventDetailDrawer
          eventName={selectedEventName}
          eventNamespace={selectedEventNamespace}
          open={!!selectedEventName}
          onClose={onToggleEventDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <LeaseDetailDrawer
          leaseName={selectedLeaseName}
          leaseNamespace={selectedLeaseNamespace}
          open={!!selectedLeaseName && !!selectedLeaseNamespace}
          onClose={onToggleLease}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <PriorityClassDetailDrawer
          priorityClassName={selectedPriorityClassName}
          open={!!selectedPriorityClassName}
          onClose={onTogglePriorityClass}
        />
      </Suspense>
    </>
  );
};
