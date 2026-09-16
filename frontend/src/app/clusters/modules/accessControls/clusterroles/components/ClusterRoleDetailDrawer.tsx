import {
  AnnotationBadge,
  Badge,
  ButtonGroup,
  LoadingSpinner,
  ResourceDeletionButton,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
  ResourceModificationButton,
  ScrollArea,
  SheetTitle,
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
import type { ClusterRole } from "../api/resources";
import { useGetClusterRoleDetail } from "../hooks/data-access/useGetClusterRoleDetail";
import { useDeleteClusterRole } from "../hooks/data-mutation/useDeleteClusterRole";
import { ClusterRoleDeleteConfirmationModal } from "./ClusterRoleDeleteConfirmationModal";

const ClusterRoleOverviewTab: FC<{ cr: ClusterRole }> = ({ cr }) => {
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {cr.Age} ago ({cr.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{cr.Name}</span>

        <span className="text-h3 text-muted-foreground">Labels</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(cr.Labels ?? {}).length > 0 ? (
            Object.entries(cr.Labels).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Annotations</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(cr.Annotations ?? {}).length > 0 ? (
            Object.entries(cr.Annotations).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        {(cr.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {cr.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        <div className="col-span-2 flex items-center gap-2 pt-1">
          <span className="shrink-0 text-xs text-muted-foreground">Rules</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {(cr.Rules ?? []).length === 0 ? (
          <span className="col-span-2 text-muted-foreground">—</span>
        ) : (
          cr.Rules.map((rule) => (
            <div
              key={`${rule.Resources.join(",")}|${rule.Verbs.join(",")}`}
              className="col-span-2 flex flex-col gap-2 rounded-md border border-zinc-800 p-3"
            >
              <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-y-2 text-xs">
                <span className="text-muted-foreground">Resources</span>
                <div className="flex flex-wrap gap-1">
                  {rule.Resources.length > 0 ? (
                    rule.Resources.map((r) => (
                      <Badge key={r} variant="secondary" className="font-mono text-xs">
                        {r}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <span className="text-muted-foreground">Verbs</span>
                <div className="flex flex-wrap gap-1">
                  {rule.Verbs.length > 0 ? (
                    rule.Verbs.map((v) => (
                      <Badge key={v} variant="secondary" className="font-mono text-xs">
                        {v}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <span className="text-muted-foreground">Api Groups</span>
                <div className="flex flex-wrap gap-1">
                  {rule.APIGroups.length > 0 ? (
                    rule.APIGroups.map((g) => (
                      <Badge key={g || "core"} variant="secondary" className="font-mono text-xs">
                        {g === "" ? "core" : g}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                {rule.ResourceNames.length > 0 && (
                  <>
                    <span className="text-muted-foreground">Resource Names</span>
                    <div className="flex flex-wrap gap-1">
                      {rule.ResourceNames.map((rn) => (
                        <Badge key={rn} variant="secondary" className="font-mono text-xs">
                          {rn}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}

                {rule.NonResourceURLs.length > 0 && (
                  <>
                    <span className="text-muted-foreground">Non-Resource URLs</span>
                    <div className="flex flex-wrap gap-1">
                      {rule.NonResourceURLs.map((u) => (
                        <Badge key={u} variant="secondary" className="font-mono text-xs">
                          {u}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
};

interface ClusterRoleDrawerCtaButtonsProps {
  clusterRoleName: string;
  onClose: () => void;
}

const ClusterRoleDrawerCtaButtons: FC<ClusterRoleDrawerCtaButtonsProps> = ({
  clusterRoleName,
  onClose,
}) => {
  const { onToggleClusterRoleDetail } = useDetailDrawerContext((v) => ({
    onToggleClusterRoleDetail: v.onToggleClusterRoleDetail,
  }));

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { mutate: deleteClusterRole, isPending: isDeletePending } = useDeleteClusterRole();
  const { openTab } = useUnifiedTray();

  const handleDeleteConfirm = () => {
    deleteClusterRole(
      { name: clusterRoleName },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onToggleClusterRoleDetail(undefined);
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
            ariaLabel="Edit ClusterRole"
            onClick={() => openTab("modification", { kind: "ClusterRole", name: clusterRoleName })}
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete ClusterRole"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <ClusterRoleDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={clusterRoleName}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const ClusterRoleEventsTab: FC<{ cr: ClusterRole }> = ({ cr }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [] });
  const crEvents = events.filter(
    (e) => e.InvolvedObjectKind.toLowerCase() === "clusterrole" && e.InvolvedObjectName === cr.Name
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={crEvents} />
    </ScrollArea>
  );
};

interface ClusterRoleDetailDrawerProps {
  clusterRoleName: string | null;
  open: boolean;
  onClose: () => void;
}
const ClusterRoleDrawerBody: FC<
  ClusterRoleDetailDrawerProps & {
    clusterRoleName: string;
    onDataChange: (cr: ClusterRole | undefined) => void;
  }
> = ({ clusterRoleName, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: cr, isLoading } = useGetClusterRoleDetail(activeContext, clusterRoleName);
  useCatchForbiddenResource("clusterroles", {
    open,
    resourceName: clusterRoleName,
    resourceLabel: "ClusterRole",
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(cr);
  }, [cr, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!cr) {
    return <ResourceDetailEmptyBody resourceKind="ClusterRole" />;
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
        <ClusterRoleOverviewTab cr={cr} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <ClusterRoleEventsTab cr={cr} />}
      </TabsContent>
    </Tabs>
  );
};

export const ClusterRoleDetailDrawer: FC<ClusterRoleDetailDrawerProps> = ({
  clusterRoleName,
  open,
  onClose,
}) => {
  const [cr, setCr] = useState<ClusterRole | undefined>(undefined);

  const hasData = !!clusterRoleName;
  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Cluster Role: {cr?.Name ?? clusterRoleName}</SheetTitle>
        {cr && <ClusterRoleDrawerCtaButtons clusterRoleName={cr.Name} onClose={onClose} />}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <ClusterRoleDrawerBody
          key={clusterRoleName}
          clusterRoleName={clusterRoleName}
          open={open}
          onClose={onClose}
          onDataChange={setCr}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Cluster Role" />
      )}
    </ResourceDetailDrawer>
  );
};
