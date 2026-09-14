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
import type { Endpoint } from "../api/resources";
import { useGetEndpointDetail } from "../hooks/data-access/useGetEndpointDetail";
import { useDeleteEndpoint } from "../hooks/data-mutation/useDeleteEndpoint";
import { EndpointDeleteConfirmationModal } from "./EndpointDeleteConfirmationModal";

const EndpointOverviewTab: FC<{ ep: Endpoint }> = ({ ep }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));
  const flatAddresses = (ep.Subsets ?? []).flatMap((s, si) =>
    (s.Addresses ?? []).map((addr, ai) => ({ ...addr, _key: `${si}-${ai}` }))
  );
  const flatPorts = (ep.Subsets ?? []).flatMap((s, si) =>
    (s.Ports ?? []).map((p, pi) => ({ ...p, _key: `${si}-${pi}` }))
  );

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {/* Metadata */}
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
          <span className="text-h3 text-muted-foreground">Created</span>
          <span className="text-body font-mono">
            {ep.Age} ago ({ep.CreatedAt})
          </span>

          <span className="text-h3 text-muted-foreground">Name</span>
          <span className="text-body font-mono">{ep.Name}</span>

          <span className="text-h3 text-muted-foreground">Namespace</span>
          <ResourceLink onClick={() => onToggleNamespaceDetail(ep.Namespace)}>
            {ep.Namespace}
          </ResourceLink>

          {Object.keys(ep.Labels ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Labels</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(ep.Labels ?? {}).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {Object.keys(ep.Annotations ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Annotations</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(ep.Annotations ?? {}).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {(ep.ManagedFields ?? []).length > 0 && (
            <>
              <span className="text-h3 self-start pt-0.5 text-muted-foreground">
                Managed Fields
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                {ep.ManagedFields.map((mf) => (
                  <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
                ))}
              </div>
            </>
          )}
        </div>

        <Separator />
        <SectionDivider label="Subsets" className="border-y-0 bg-muted/50 tracking-wide" />

        <div className="px-4 py-2 text-xs font-semibold">Addresses</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">IP</TableHead>
              <TableHead className="text-xs">Hostname</TableHead>
              <TableHead className="text-xs">Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flatAddresses.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-xs text-muted-foreground">
                  No addresses
                </TableCell>
              </TableRow>
            )}
            {flatAddresses.map((addr) => (
              <TableRow key={addr._key}>
                <TableCell className="font-mono text-xs">{addr.IP}</TableCell>
                <TableCell className="text-xs">{addr.Hostname || "—"}</TableCell>
                <TableCell className="text-xs">
                  <ResourceLink>{addr.TargetName || "—"}</ResourceLink>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="px-4 py-2 text-xs font-semibold">Ports</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Port</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Protocol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flatPorts.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-xs text-muted-foreground">
                  No ports
                </TableCell>
              </TableRow>
            )}
            {flatPorts.map((p) => (
              <TableRow key={p._key}>
                <TableCell className="font-mono text-xs">
                  <ResourceLink>{p.Port}</ResourceLink>
                </TableCell>
                <TableCell className="text-xs">{p.Name || "—"}</TableCell>
                <TableCell className="text-xs">{p.Protocol}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
};

interface EndpointDrawerCtaButtonsProps {
  endpointName: string;
  endpointNamespace: string;
  onClose: () => void;
}

const EndpointDrawerCtaButtons: FC<EndpointDrawerCtaButtonsProps> = ({
  endpointName,
  endpointNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteEndpoint, isPending: isDeletePending } = useDeleteEndpoint();

  const handleDeleteConfirm = () => {
    deleteEndpoint(
      { namespace: endpointNamespace, name: endpointName },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onClose();
        },
      }
    );
  };

  return (
    <>
      <ButtonGroup>
        <TooltipProvider>
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit Endpoint"
            onClick={() =>
              openTab("modification", {
                kind: "Endpoint",
                name: endpointName,
                namespace: endpointNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete Endpoint"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <EndpointDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={endpointName}
        namespace={endpointNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const EndpointEventsTab: FC<{ ep: Endpoint }> = ({ ep }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [ep.Namespace],
  });
  const epEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "endpoints" &&
      e.InvolvedObjectName === ep.Name &&
      e.Namespace === ep.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={epEvents} />
    </ScrollArea>
  );
};

interface EndpointDetailDrawerProps {
  endpointName: string | null;
  endpointNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const EndpointDrawerBody: FC<
  EndpointDetailDrawerProps & {
    endpointName: string;
    endpointNamespace: string;
    onDataChange: (ep: Endpoint | undefined) => void;
  }
> = ({ endpointName, endpointNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: ep, isLoading } = useGetEndpointDetail(
    activeContext,
    endpointNamespace,
    endpointName
  );
  useCatchForbiddenResource("endpoints", {
    open,
    resourceName: endpointName,
    resourceLabel: "Endpoint",
    namespace: endpointNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(ep?.Name ? ep : undefined);
  }, [ep, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!ep?.Name) {
    return <ResourceDetailEmptyBody resourceKind="Endpoint" />;
  }

  return (
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
        <EndpointOverviewTab ep={ep} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <EndpointEventsTab ep={ep} />}
      </TabsContent>
    </Tabs>
  );
};

export const EndpointDetailDrawer: FC<EndpointDetailDrawerProps> = ({
  endpointName,
  endpointNamespace,
  open,
  onClose,
}) => {
  const [ep, setEp] = useState<Endpoint | undefined>(undefined);

  const hasData = !!endpointName && !!endpointNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Endpoints: {ep?.Name ?? endpointName}</SheetTitle>
        {ep && (
          <EndpointDrawerCtaButtons
            endpointName={ep.Name}
            endpointNamespace={ep.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <EndpointDrawerBody
          key={endpointName}
          endpointName={endpointName!}
          endpointNamespace={endpointNamespace!}
          open={open}
          onClose={onClose}
          onDataChange={setEp}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Endpoint" />
      )}
    </ResourceDetailDrawer>
  );
};
