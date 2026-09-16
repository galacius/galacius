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
import type { RoleBinding } from "../api/resources";
import { useGetRoleBindingDetail } from "../hooks/data-access/useGetRoleBindingDetail";
import { useDeleteRoleBinding } from "../hooks/data-mutation/useDeleteRoleBinding";
import { RoleBindingDeleteConfirmationModal } from "./RoleBindingDeleteConfirmationModal";

const RoleBindingOverviewTab: FC<{ rb: RoleBinding }> = ({ rb }) => {
  const { onToggleNamespaceDetail, onToggleRoleDetail, onToggleServiceAccountDetail } =
    useDetailDrawerContext((v) => ({
      onToggleNamespaceDetail: v.onToggleNamespaceDetail,
      onToggleRoleDetail: v.onToggleRoleDetail,
      onToggleServiceAccountDetail: v.onToggleServiceAccountDetail,
    }));

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {rb.Age} ago ({rb.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{rb.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <span className="text-body font-mono">
          <ResourceLink onClick={() => onToggleNamespaceDetail(rb.Namespace)}>
            {rb.Namespace}
          </ResourceLink>
        </span>

        <span className="text-h3 text-muted-foreground">Labels</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(rb.Labels ?? {}).length > 0 ? (
            Object.entries(rb.Labels).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Annotations</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(rb.Annotations ?? {}).length > 0 ? (
            Object.entries(rb.Annotations).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        {(rb.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {rb.ManagedFields.map((mf) => (
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
                <TableCell className="font-mono text-xs">{rb.RoleRefKind}</TableCell>
                <TableCell className="font-mono text-xs">
                  <ResourceLink onClick={() => onToggleRoleDetail(rb.Namespace, rb.RoleRefName)}>
                    {rb.RoleRefName}
                  </ResourceLink>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {rb.RoleRefGroup || "—"}
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
          {(rb.Subjects ?? []).length === 0 ? (
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
                {rb.Subjects.map((s) => (
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

const RoleBindingEventsTab: FC<{ rb: RoleBinding }> = ({ rb }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [rb.Namespace],
  });
  const rbEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "rolebinding" &&
      e.InvolvedObjectName === rb.Name &&
      e.Namespace === rb.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={rbEvents} />
    </ScrollArea>
  );
};

interface RoleBindingDrawerCtaButtonsProps {
  roleBindingName: string;
  roleBindingNamespace: string;
  onClose: () => void;
}

const RoleBindingDrawerCtaButtons: FC<RoleBindingDrawerCtaButtonsProps> = ({
  roleBindingName,
  roleBindingNamespace,
  onClose,
}) => {
  const { onToggleRoleBindingDetail } = useDetailDrawerContext((v) => ({
    onToggleRoleBindingDetail: v.onToggleRoleBindingDetail,
  }));

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteRoleBinding, isPending: isDeletePending } = useDeleteRoleBinding();

  const handleDeleteConfirm = () => {
    deleteRoleBinding(
      { namespace: roleBindingNamespace, name: roleBindingName },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onToggleRoleBindingDetail(undefined, undefined);
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
            ariaLabel="Edit RoleBinding"
            onClick={() =>
              openTab("modification", {
                kind: "RoleBinding",
                name: roleBindingName,
                namespace: roleBindingNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete RoleBinding"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <RoleBindingDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={roleBindingName}
        namespace={roleBindingNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface RoleBindingDetailDrawerProps {
  roleBindingName: string | null;
  roleBindingNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const RoleBindingDrawerBody: FC<
  RoleBindingDetailDrawerProps & {
    roleBindingName: string;
    roleBindingNamespace: string;
    onDataChange: (rb: RoleBinding | undefined) => void;
  }
> = ({ roleBindingName, roleBindingNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: rb, isLoading } = useGetRoleBindingDetail(
    activeContext,
    roleBindingNamespace,
    roleBindingName
  );
  useCatchForbiddenResource("rolebindings", {
    open,
    resourceName: roleBindingName,
    resourceLabel: "RoleBinding",
    namespace: roleBindingNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(rb);
  }, [rb, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!rb) {
    return <ResourceDetailEmptyBody resourceKind="RoleBinding" />;
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
        <RoleBindingOverviewTab rb={rb} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <RoleBindingEventsTab rb={rb} />}
      </TabsContent>
    </Tabs>
  );
};

export const RoleBindingDetailDrawer: FC<RoleBindingDetailDrawerProps> = ({
  roleBindingName,
  roleBindingNamespace,
  open,
  onClose,
}) => {
  const [rb, setRb] = useState<RoleBinding | undefined>(undefined);

  const hasData = !!roleBindingName && !!roleBindingNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Role Binding: {rb?.Name ?? roleBindingName}</SheetTitle>
        {rb && (
          <RoleBindingDrawerCtaButtons
            roleBindingName={rb.Name}
            roleBindingNamespace={rb.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <RoleBindingDrawerBody
          key={`${roleBindingNamespace}/${roleBindingName}`}
          roleBindingName={roleBindingName}
          roleBindingNamespace={roleBindingNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setRb}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Role Binding" />
      )}
    </ResourceDetailDrawer>
  );
};
