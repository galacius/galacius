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
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { ClusterRoleBinding } from "../api/resources";
import { useGetClusterRoleBindingDetail } from "../hooks/data-access/useGetClusterRoleBindingDetail";
import { useDeleteClusterRoleBinding } from "../hooks/data-mutation/useDeleteClusterRoleBinding";
import { ClusterRoleBindingDeleteConfirmationModal } from "./ClusterRoleBindingDeleteConfirmationModal";

const ClusterRoleBindingOverviewTab: FC<{ crb: ClusterRoleBinding }> = ({ crb }) => {
  const { onToggleNamespaceDetail, onToggleClusterRoleDetail, onToggleServiceAccountDetail } =
    useDetailDrawerContext((v) => ({
      onToggleNamespaceDetail: v.onToggleNamespaceDetail,
      onToggleClusterRoleDetail: v.onToggleClusterRoleDetail,
      onToggleServiceAccountDetail: v.onToggleServiceAccountDetail,
    }));

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {crb.Age} ago ({crb.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{crb.Name}</span>

        <span className="text-h3 text-muted-foreground">Labels</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(crb.Labels ?? {}).length > 0 ? (
            Object.entries(crb.Labels).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Annotations</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(crb.Annotations ?? {}).length > 0 ? (
            Object.entries(crb.Annotations).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        {(crb.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {crb.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        <div className="col-span-2 flex items-center gap-2 pt-1">
          <span className="shrink-0 text-xs text-muted-foreground">Reference</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Kind</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">API Group</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-xs">{crb.RoleRefKind}</TableCell>
                <TableCell className="font-mono text-xs">
                  <ResourceLink truncate onClick={() => onToggleClusterRoleDetail(crb.RoleRefName)}>
                    {crb.RoleRefName}
                  </ResourceLink>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {crb.RoleRefGroup || "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="col-span-2 flex items-center gap-2 pt-1">
          <span className="shrink-0 text-xs text-muted-foreground">Bindings</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="col-span-2">
          {(crb.Subjects ?? []).length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Namespace</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crb.Subjects.map((s) => (
                  <TableRow key={`${s.Kind}:${s.Name}:${s.Namespace}`}>
                    <TableCell className="font-mono text-xs">{s.Kind}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.Kind === "ServiceAccount" ? (
                        <ResourceLink
                          truncate
                          onClick={() => onToggleServiceAccountDetail(s.Namespace, s.Name)}
                        >
                          {s.Name}
                        </ResourceLink>
                      ) : (
                        s.Name
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.Namespace ? (
                        <ResourceLink onClick={() => onToggleNamespaceDetail(s.Namespace)}>
                          {s.Namespace}
                        </ResourceLink>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </ScrollArea>
  );
};

interface ClusterRoleBindingDrawerCtaButtonsProps {
  clusterRoleBindingName: string;
  onClose: () => void;
}

const ClusterRoleBindingDrawerCtaButtons: FC<ClusterRoleBindingDrawerCtaButtonsProps> = ({
  clusterRoleBindingName,
  onClose,
}) => {
  const { onToggleClusterRoleBindingDetail } = useDetailDrawerContext((v) => ({
    onToggleClusterRoleBindingDetail: v.onToggleClusterRoleBindingDetail,
  }));

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteClusterRoleBinding, isPending: isDeletePending } =
    useDeleteClusterRoleBinding();

  const handleDeleteConfirm = () => {
    deleteClusterRoleBinding(
      { name: clusterRoleBindingName },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onToggleClusterRoleBindingDetail(undefined);
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
            ariaLabel="Edit ClusterRoleBinding"
            onClick={() =>
              openTab("modification", { kind: "ClusterRoleBinding", name: clusterRoleBindingName })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete ClusterRoleBinding"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <ClusterRoleBindingDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={clusterRoleBindingName}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const ClusterRoleBindingEventsTab: FC<{ crb: ClusterRoleBinding }> = ({ crb }) => {
  const { activeContext } = useMainLayoutContext();
  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [] });
  const crbEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "clusterrolebinding" &&
      e.InvolvedObjectName === crb.Name
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={crbEvents} />
    </ScrollArea>
  );
};

interface ClusterRoleBindingDetailDrawerProps {
  clusterRoleBindingName: string | null;
  open: boolean;
  onClose: () => void;
}

const ClusterRoleBindingDrawerBody: FC<
  ClusterRoleBindingDetailDrawerProps & {
    clusterRoleBindingName: string;
    onDataChange: (crb: ClusterRoleBinding | undefined) => void;
  }
> = ({ clusterRoleBindingName, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: crb, isLoading } = useGetClusterRoleBindingDetail(
    activeContext,
    clusterRoleBindingName
  );
  useCatchForbiddenResource("clusterrolebindings", {
    open,
    resourceName: clusterRoleBindingName,
    resourceLabel: "ClusterRoleBinding",
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(crb);
  }, [crb, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!crb) {
    return <ResourceDetailEmptyBody resourceKind="ClusterRoleBinding" />;
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
        <ClusterRoleBindingOverviewTab crb={crb} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <ClusterRoleBindingEventsTab crb={crb} />}
      </TabsContent>
    </Tabs>
  );
};

export const ClusterRoleBindingDetailDrawer: FC<ClusterRoleBindingDetailDrawerProps> = ({
  clusterRoleBindingName,
  open,
  onClose,
}) => {
  const [crb, setCrb] = useState<ClusterRoleBinding | undefined>(undefined);

  const hasData = !!clusterRoleBindingName;
  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">
          Cluster Role Binding: {crb?.Name ?? clusterRoleBindingName}
        </SheetTitle>
        {crb && (
          <ClusterRoleBindingDrawerCtaButtons clusterRoleBindingName={crb.Name} onClose={onClose} />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <ClusterRoleBindingDrawerBody
          key={clusterRoleBindingName}
          clusterRoleBindingName={clusterRoleBindingName}
          open={open}
          onClose={onClose}
          onDataChange={setCrb}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Cluster Role Binding" />
      )}
    </ResourceDetailDrawer>
  );
};
