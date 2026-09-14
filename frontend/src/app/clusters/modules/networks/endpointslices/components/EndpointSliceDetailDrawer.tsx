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
import type { EndpointSlice } from "../api/resources";
import { useGetEndpointSliceByName } from "../hooks/data-access/useGetEndpointSliceByName";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import { useDeleteEndpointSlice } from "../hooks/data-mutation/useDeleteEndpointSlice";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { EndpointSliceDeleteConfirmationModal } from "./EndpointSliceDeleteConfirmationModal";

const EndpointSliceOverviewTab: FC<{ slice: EndpointSlice }> = ({ slice }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {/* Metadata */}
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
          <span className="text-h3 text-muted-foreground">Created</span>
          <span className="text-body font-mono">
            {slice.Age} ago ({slice.CreatedAt})
          </span>

          <span className="text-h3 text-muted-foreground">Name</span>
          <span className="text-body font-mono">{slice.Name}</span>

          <span className="text-h3 text-muted-foreground">Namespace</span>
          <ResourceLink onClick={() => onToggleNamespaceDetail(slice.Namespace)}>
            {slice.Namespace}
          </ResourceLink>

          {Object.keys(slice.Labels ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Labels</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(slice.Labels ?? {}).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {Object.keys(slice.Annotations ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Annotations</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(slice.Annotations ?? {}).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {slice.ControlledBy && (
            <>
              <span className="text-h3 text-muted-foreground">Controlled By</span>
              <span className="text-body">{slice.ControlledBy}</span>
            </>
          )}

          {(slice.ManagedFields ?? []).length > 0 && (
            <>
              <span className="text-h3 self-start pt-0.5 text-muted-foreground">
                Managed Fields
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                {slice.ManagedFields.map((mf) => (
                  <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Endpoints section */}
        <Separator />
        <SectionDivider label="Endpoints" className="border-y-0 bg-muted/50 tracking-wide" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">IP</TableHead>
              <TableHead className="text-xs">Hostname</TableHead>
              <TableHead className="text-xs">Node</TableHead>
              <TableHead className="text-xs">Zone</TableHead>
              <TableHead className="text-xs">Target</TableHead>
              <TableHead className="text-xs">Conditions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(slice.Endpoints ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                  No endpoints
                </TableCell>
              </TableRow>
            )}
            {(slice.Endpoints ?? []).map((ep) => {
              const target =
                ep.TargetKind && ep.TargetName ? `${ep.TargetKind}/${ep.TargetName}` : "—";

              const conditions: React.ReactNode[] = [];
              if (ep.Ready)
                conditions.push(
                  <span
                    key="ready"
                    className="rounded bg-success/15 px-1.5 py-0.5 text-xs text-success"
                  >
                    Ready
                  </span>
                );
              if (ep.Serving)
                conditions.push(
                  <span
                    key="serving"
                    className="rounded bg-info/15 px-1.5 py-0.5 text-xs text-info"
                  >
                    Serving
                  </span>
                );
              if (ep.Terminating)
                conditions.push(
                  <span
                    key="terminating"
                    className="rounded bg-danger/15 px-1.5 py-0.5 text-xs text-danger"
                  >
                    Terminating
                  </span>
                );

              return (
                <TableRow key={(ep.Addresses ?? []).join(",") || target}>
                  <TableCell className="font-mono text-xs">
                    {(ep.Addresses ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs">{ep.Hostname || "—"}</TableCell>
                  <TableCell className="text-xs">{ep.NodeName || "—"}</TableCell>
                  <TableCell className="text-xs">{ep.Zone || "—"}</TableCell>
                  <TableCell className="text-xs">{target}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {conditions.length > 0 ? conditions : <span className="text-xs">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Ports section */}
        <Separator />
        <SectionDivider label="Ports" className="border-y-0 bg-muted/50 tracking-wide" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Port</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Protocol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(slice.Ports ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-xs text-muted-foreground">
                  No ports
                </TableCell>
              </TableRow>
            )}
            {(slice.Ports ?? []).map((p) => (
              <TableRow key={`${p.Port}/${p.Protocol}`}>
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

interface EndpointSliceDrawerCtaButtonsProps {
  sliceName: string;
  sliceNamespace: string;
  onClose: () => void;
}

const EndpointSliceDrawerCtaButtons: FC<EndpointSliceDrawerCtaButtonsProps> = ({
  sliceName,
  sliceNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteEndpointSlice, isPending: isDeletePending } = useDeleteEndpointSlice();

  const handleDeleteConfirm = () => {
    deleteEndpointSlice(
      { namespace: sliceNamespace, name: sliceName },
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
            ariaLabel="Edit Endpoint Slice"
            onClick={() =>
              openTab("modification", {
                kind: "EndpointSlice",
                name: sliceName,
                namespace: sliceNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete Endpoint Slice"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <EndpointSliceDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={sliceName}
        namespace={sliceNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const EndpointSliceEventsTab: FC<{ slice: EndpointSlice }> = ({ slice }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [slice.Namespace],
  });
  const sliceEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "endpointslice" &&
      e.InvolvedObjectName === slice.Name &&
      e.Namespace === slice.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={sliceEvents} />
    </ScrollArea>
  );
};

interface EndpointSliceDetailDrawerProps {
  sliceName: string | null;
  sliceNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const EndpointSliceDrawerBody: FC<
  EndpointSliceDetailDrawerProps & {
    sliceName: string;
    sliceNamespace: string;
    onDataChange: (slice: EndpointSlice | undefined) => void;
  }
> = ({ sliceName, sliceNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: slice, isLoading } = useGetEndpointSliceByName(
    activeContext,
    sliceNamespace,
    sliceName
  );
  useCatchForbiddenResource("endpointslices", {
    open,
    resourceName: sliceName,
    resourceLabel: "Endpoint Slice",
    namespace: sliceNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(slice?.Name ? slice : undefined);
  }, [slice, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!slice?.Name) {
    return <ResourceDetailEmptyBody resourceKind="EndpointSlice" />;
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
        <EndpointSliceOverviewTab slice={slice} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <EndpointSliceEventsTab slice={slice} />}
      </TabsContent>
    </Tabs>
  );
};

export const EndpointSliceDetailDrawer: FC<EndpointSliceDetailDrawerProps> = ({
  sliceName,
  sliceNamespace,
  open,
  onClose,
}) => {
  const [slice, setSlice] = useState<EndpointSlice | undefined>(undefined);

  const hasData = !!sliceName && !!sliceNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Endpoint Slice: {slice?.Name ?? sliceName}</SheetTitle>
        {slice && (
          <EndpointSliceDrawerCtaButtons
            sliceName={slice.Name}
            sliceNamespace={slice.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <EndpointSliceDrawerBody
          key={sliceName}
          sliceName={sliceName}
          sliceNamespace={sliceNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setSlice}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="EndpointSlice" />
      )}
    </ResourceDetailDrawer>
  );
};
