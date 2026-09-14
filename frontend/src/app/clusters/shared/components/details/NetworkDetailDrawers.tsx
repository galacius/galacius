import { LoadingSpinner } from "@galacius/design-system";
import { FC, lazy, Suspense } from "react";
import { useDetailDrawerContext } from "./DetailDrawerContext";

const IngressDetailDrawer = lazy(() =>
  import("../../../modules/networks/ingresses/components/IngressDetailDrawer").then((m) => ({
    default: m.IngressDetailDrawer,
  }))
);
const IngressClassDetailDrawer = lazy(() =>
  import("../../../modules/networks/ingressclasses/components/IngressClassDetailDrawer").then(
    (m) => ({ default: m.IngressClassDetailDrawer })
  )
);
const ValidatingWebhookConfigDetailDrawer = lazy(() =>
  import("../../../modules/configs/validatingwebhookconfigs/components/ValidatingWebhookConfigDetailDrawer").then(
    (m) => ({ default: m.ValidatingWebhookConfigDetailDrawer })
  )
);
const NetworkPolicyDetailDrawer = lazy(() =>
  import("../../../modules/networks/networkpolicies/components/NetworkPolicyDetailDrawer").then(
    (m) => ({ default: m.NetworkPolicyDetailDrawer })
  )
);
const ServiceDetailDrawer = lazy(() =>
  import("../../../modules/networks/services/components/ServiceDetailDrawer").then((m) => ({
    default: m.ServiceDetailDrawer,
  }))
);
const EndpointDetailDrawer = lazy(() =>
  import("../../../modules/networks/endpoints/components/EndpointDetailDrawer").then((m) => ({
    default: m.EndpointDetailDrawer,
  }))
);
const EndpointSliceDetailDrawer = lazy(() =>
  import("../../../modules/networks/endpointslices/components/EndpointSliceDetailDrawer").then(
    (m) => ({ default: m.EndpointSliceDetailDrawer })
  )
);

export const NetworkDetailDrawers: FC<{ onNavigateToPortForwarding: () => void }> = ({
  onNavigateToPortForwarding,
}) => {
  const {
    selectedIngressName,
    selectedIngressNamespace,
    onToggleIngressDetail,

    selectedIngressClassName,
    onToggleIngressClassDetail,

    selectedValidatingWebhookConfigName,
    onToggleValidatingWebhookConfigDetail,

    selectedNetworkPolicyName,
    selectedNetworkPolicyNamespace,
    onToggleNetworkPolicyDetail,

    selectedServiceName,
    selectedServiceNamespace,
    onToggleServiceDetail,

    selectedEndpointName,
    selectedEndpointNamespace,
    onToggleEndpointDetail,

    selectedEndpointSliceName,
    selectedEndpointSliceNamespace,
    onToggleEndpointSliceDetail,
  } = useDetailDrawerContext((v) => ({
    selectedIngressName: v.selectedIngressName,
    selectedIngressNamespace: v.selectedIngressNamespace,
    onToggleIngressDetail: v.onToggleIngressDetail,

    selectedIngressClassName: v.selectedIngressClassName,
    onToggleIngressClassDetail: v.onToggleIngressClassDetail,

    selectedValidatingWebhookConfigName: v.selectedValidatingWebhookConfigName,
    onToggleValidatingWebhookConfigDetail: v.onToggleValidatingWebhookConfigDetail,

    selectedNetworkPolicyName: v.selectedNetworkPolicyName,
    selectedNetworkPolicyNamespace: v.selectedNetworkPolicyNamespace,
    onToggleNetworkPolicyDetail: v.onToggleNetworkPolicyDetail,

    selectedServiceName: v.selectedServiceName,
    selectedServiceNamespace: v.selectedServiceNamespace,
    onToggleServiceDetail: v.onToggleServiceDetail,

    selectedEndpointName: v.selectedEndpointName,
    selectedEndpointNamespace: v.selectedEndpointNamespace,
    onToggleEndpointDetail: v.onToggleEndpointDetail,

    selectedEndpointSliceName: v.selectedEndpointSliceName,
    selectedEndpointSliceNamespace: v.selectedEndpointSliceNamespace,
    onToggleEndpointSliceDetail: v.onToggleEndpointSliceDetail,
  }));

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <IngressDetailDrawer
          ingressName={selectedIngressName}
          ingressNamespace={selectedIngressNamespace}
          open={!!selectedIngressName && !!selectedIngressNamespace}
          onClose={onToggleIngressDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <IngressClassDetailDrawer
          ingressClassName={selectedIngressClassName}
          open={!!selectedIngressClassName}
          onClose={onToggleIngressClassDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <ValidatingWebhookConfigDetailDrawer
          vwcName={selectedValidatingWebhookConfigName}
          open={!!selectedValidatingWebhookConfigName}
          onClose={onToggleValidatingWebhookConfigDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <NetworkPolicyDetailDrawer
          npName={selectedNetworkPolicyName}
          npNamespace={selectedNetworkPolicyNamespace}
          open={!!selectedNetworkPolicyName && !!selectedNetworkPolicyNamespace}
          onClose={onToggleNetworkPolicyDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <ServiceDetailDrawer
          serviceName={selectedServiceName}
          serviceNamespace={selectedServiceNamespace}
          open={!!selectedServiceName}
          onClose={onToggleServiceDetail}
          onNavigateToPortForwarding={() => {
            onNavigateToPortForwarding();
            onToggleServiceDetail();
          }}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <EndpointDetailDrawer
          endpointName={selectedEndpointName}
          endpointNamespace={selectedEndpointNamespace}
          open={!!selectedEndpointName && !!selectedEndpointNamespace}
          onClose={onToggleEndpointDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <EndpointSliceDetailDrawer
          sliceName={selectedEndpointSliceName}
          sliceNamespace={selectedEndpointSliceNamespace}
          open={!!selectedEndpointSliceName && !!selectedEndpointSliceNamespace}
          onClose={onToggleEndpointSliceDetail}
        />
      </Suspense>
    </>
  );
};
