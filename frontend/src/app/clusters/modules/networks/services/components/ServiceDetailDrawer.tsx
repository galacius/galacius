import {
  AnnotationBadge,
  ButtonGroup,
  LoadingSpinner,
  ResourceDeletionButton,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
  ResourceLink,
  ResourceModificationButton,
  ScrollArea,
  Separator,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TooltipProvider,
} from "@galacius/design-system";
import { FC, useEffect, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import { PortForwardCtaButton } from "../../portforwarding/components/PortForwardCtaButton";
import { PortForwardOperationDialog } from "../../portforwarding/components/PortForwardOperationDialog";
import { useGetPortForwards } from "../../portforwarding/hooks/data-access/useGetPortForwards";
import type { Service } from "../api/resources";
import { useGetServiceDetail } from "../hooks/data-access/useGetServiceDetail";
import { useDeleteService } from "../hooks/data-mutation/useDeleteService";
import { ServiceDeleteConfirmationModal } from "./ServiceDeleteConfirmationModal";
import { ServiceStatusBadge } from "./ServiceStatusBadge";

type ServicePort = Service["ServicePorts"][number];

const formatPort = (p: ServicePort) => {
  return p.Name
    ? `${p.Name}: ${p.Port} → ${p.TargetPort}/${p.Protocol}`
    : `${p.Port} → ${p.TargetPort}/${p.Protocol}`;
};

interface ServiceOverviewTabProps {
  svc: Service;
  onForwardPort: (port: ServicePort) => void;
  onNavigateToPortForwarding: () => void;
}

const ServiceOverviewTab: FC<ServiceOverviewTabProps> = ({
  svc,
  onForwardPort,
  onNavigateToPortForwarding,
}) => {
  const { activeContext } = useMainLayoutContext();
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  const { data: portForwards = [] } = useGetPortForwards({ context: activeContext });

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {/* Metadata */}
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
          <span className="text-h3 text-muted-foreground">Created</span>
          <span className="text-body font-mono">
            {svc.Age} ago ({svc.CreatedAt})
          </span>

          <span className="text-h3 text-muted-foreground">Name</span>
          <span className="text-body font-mono">{svc.Name}</span>

          <span className="text-h3 text-muted-foreground">Namespace</span>
          <ResourceLink onClick={() => onToggleNamespaceDetail(svc.Namespace)}>
            {svc.Namespace}
          </ResourceLink>

          <span className="text-h3 text-muted-foreground">Status</span>
          <ServiceStatusBadge status={svc.Status} />

          {Object.keys(svc.Labels ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Labels</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(svc.Labels ?? {}).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {Object.keys(svc.Annotations ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Annotations</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(svc.Annotations ?? {}).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {(svc.ManagedFields ?? []).length > 0 && (
            <>
              <span className="text-h3 self-start pt-0.5 text-muted-foreground">
                Managed Fields
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                {svc.ManagedFields.map((mf) => (
                  <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
                ))}
              </div>
            </>
          )}

          {Object.keys(svc.Selector ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Selector</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(svc.Selector).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          <span className="text-h3 text-muted-foreground">Type</span>
          <span className="text-body">{svc.Type}</span>

          <span className="text-h3 text-muted-foreground">Session Affinity</span>
          <span className="text-body">{svc.SessionAffinity}</span>

          <span className="text-h3 text-muted-foreground">Internal Traffic Policy</span>
          <span className="text-body">{svc.InternalTrafficPolicy}</span>
        </div>

        {/* Connection section */}
        <Separator />
        <SectionDivider label="Connection" className="border-y-0 bg-muted/50 tracking-wide" />
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 px-4 py-3">
          <span className="text-h3 text-muted-foreground">Cluster IP</span>
          <span className="text-body font-mono">{svc.ClusterIP}</span>

          {(svc.ClusterIPs ?? []).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Cluster IPs</span>
              <div className="flex flex-wrap gap-1">
                {svc.ClusterIPs.map((ip) => (
                  <span key={ip} className="text-body font-mono">
                    {ip}
                  </span>
                ))}
              </div>
            </>
          )}

          {svc.IPFamilyPolicy && (
            <>
              <span className="text-h3 text-muted-foreground">IP Family Policy</span>
              <span className="text-body">{svc.IPFamilyPolicy}</span>
            </>
          )}

          {(svc.IPFamilies ?? []).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">IP Families</span>
              <span className="text-body">{svc.IPFamilies.join(", ")}</span>
            </>
          )}

          {(svc.ServicePorts ?? []).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Ports</span>
              <div className="flex flex-col gap-1.5">
                {svc.ServicePorts.map((p) => {
                  const activePf = portForwards.find(
                    (pf) =>
                      pf.Name === svc.Name &&
                      pf.Namespace === svc.Namespace &&
                      pf.TargetPort === p.TargetPort &&
                      pf.Protocol === p.Protocol
                  );
                  return (
                    <div
                      key={`${p.Port}/${p.Protocol}/${p.Name}`}
                      className="flex items-center gap-2"
                    >
                      <ResourceLink className="text-body font-mono">{formatPort(p)}</ResourceLink>
                      <PortForwardCtaButton
                        activePf={activePf}
                        port={p.Port}
                        svcName={svc.Name}
                        onForwardPort={() => onForwardPort(p)}
                        onNavigateToPortForwarding={onNavigateToPortForwarding}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Endpoint Slices section */}
        <Separator />
        <SectionDivider label="Endpoint Slices" className="border-y-0 bg-muted/50 tracking-wide" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Ports</TableHead>
              <TableHead className="text-xs">Endpoints</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                Not available
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
};

const ServiceEventsTab: FC<{ svc: Service }> = ({ svc }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [svc.Namespace],
  });
  const svcEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "service" &&
      e.InvolvedObjectName === svc.Name &&
      e.Namespace === svc.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={svcEvents} />
    </ScrollArea>
  );
};

interface ServiceDrawerCtaButtonsProps {
  serviceName: string;
  serviceNamespace: string;
  onClose: () => void;
}

const ServiceDrawerCtaButtons: FC<ServiceDrawerCtaButtonsProps> = ({
  serviceName,
  serviceNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { mutate: deleteService, isPending: isDeletePending } = useDeleteService();

  const handleDeleteConfirm = () => {
    deleteService(
      { namespace: serviceNamespace, name: serviceName },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onClose();
        },
      }
    );
  };

  const { openTab } = useUnifiedTray();

  return (
    <>
      <ButtonGroup>
        <TooltipProvider>
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit Service"
            onClick={() =>
              openTab("modification", {
                kind: "Service",
                name: serviceName,
                namespace: serviceNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete Service"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <ServiceDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={serviceName}
        namespace={serviceNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface ServiceDetailDrawerProps {
  serviceName: string | null;
  serviceNamespace: string | null;
  open: boolean;
  onClose: () => void;
  onNavigateToPortForwarding: () => void;
}

const ServiceDrawerBody: FC<
  ServiceDetailDrawerProps & {
    serviceName: string;
    serviceNamespace: string;
    onDataChange: (svc: Service | undefined) => void;
  }
> = ({
  serviceName,
  serviceNamespace,
  open,
  onClose,
  onNavigateToPortForwarding,
  onDataChange,
}) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);
  const [pendingPort, setPendingPort] = useState<ServicePort | null>(null);

  const { data: svc, isLoading } = useGetServiceDetail(
    activeContext,
    serviceNamespace,
    serviceName
  );
  useCatchForbiddenResource("services", {
    open,
    resourceName: serviceName,
    resourceLabel: "Service",
    namespace: serviceNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(svc);
  }, [svc, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!svc) {
    return <ResourceDetailEmptyBody resourceKind="Service" />;
  }

  return (
    <>
      <Tabs
        defaultValue="overview"
        className="min-h-0 flex-1"
        onValueChange={(v) => {
          if (v === "events") setEventsVisible(true);
        }}
      >
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs">
            Events
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-0 min-h-0 flex-1">
          <ServiceOverviewTab
            svc={svc}
            onForwardPort={setPendingPort}
            onNavigateToPortForwarding={onNavigateToPortForwarding}
          />
        </TabsContent>
        <TabsContent value="events" className="mt-0 min-h-0 flex-1">
          {eventsVisible && <ServiceEventsTab svc={svc} />}
        </TabsContent>
      </Tabs>

      {pendingPort && (
        <PortForwardOperationDialog
          key={`${pendingPort.Port}/${pendingPort.Protocol}`}
          open={!!pendingPort}
          resourceName={svc.Name}
          namespace={svc.Namespace}
          kind="service"
          podPort={pendingPort.TargetPort}
          servicePort={String(pendingPort.Port)}
          protocol={pendingPort.Protocol}
          onClose={() => setPendingPort(null)}
          onNavigateToPortForwarding={onNavigateToPortForwarding}
        />
      )}
    </>
  );
};

export const ServiceDetailDrawer: FC<ServiceDetailDrawerProps> = ({
  serviceName,
  serviceNamespace,
  open,
  onClose,
  onNavigateToPortForwarding,
}) => {
  const [svc, setSvc] = useState<Service | undefined>(undefined);

  const hasData = !!serviceName && !!serviceNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Service: {svc?.Name ?? serviceName}</SheetTitle>
        {svc && (
          <ServiceDrawerCtaButtons
            serviceName={svc.Name}
            serviceNamespace={svc.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <ServiceDrawerBody
          key={serviceName}
          serviceName={serviceName}
          serviceNamespace={serviceNamespace}
          open={open}
          onClose={onClose}
          onNavigateToPortForwarding={onNavigateToPortForwarding}
          onDataChange={setSvc}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Service" />
      )}
    </ResourceDetailDrawer>
  );
};
