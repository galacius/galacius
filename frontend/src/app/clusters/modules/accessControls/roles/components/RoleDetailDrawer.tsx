import {
  AnnotationBadge,
  Badge,
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
import type { Role } from "../api/resources";
import { useGetRoleDetail } from "../hooks/data-access/useGetRoleDetail";
import { useDeleteRole } from "../hooks/data-mutation/useDeleteRole";
import { RoleDeleteConfirmationModal } from "./RoleDeleteConfirmationModal";

const RoleOverviewTab: FC<{ role: Role }> = ({ role }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {role.Age} ago ({role.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{role.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(role.Namespace)}>
          {role.Namespace}
        </ResourceLink>

        <span className="text-h3 text-muted-foreground">Labels</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(role.Labels ?? {}).length > 0 ? (
            Object.entries(role.Labels).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Annotations</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(role.Annotations ?? {}).length > 0 ? (
            Object.entries(role.Annotations).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        {(role.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {role.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        <div className="col-span-2 flex items-center gap-2 pt-1">
          <span className="shrink-0 text-xs text-muted-foreground">Rules</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {(role.Rules ?? []).length === 0 ? (
          <span className="col-span-2 text-muted-foreground">—</span>
        ) : (
          role.Rules.map((rule) => (
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

const RoleEventsTab: FC<{ role: Role }> = ({ role }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [role.Namespace],
  });
  const roleEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "role" &&
      e.InvolvedObjectName === role.Name &&
      e.Namespace === role.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={roleEvents} />
    </ScrollArea>
  );
};

interface RoleDrawerCtaButtonsProps {
  roleName: string;
  roleNamespace: string;
  onClose: () => void;
}

const RoleDrawerCtaButtons: FC<RoleDrawerCtaButtonsProps> = ({
  roleName,
  roleNamespace,
  onClose,
}) => {
  const { openTab } = useUnifiedTray();
  const { onToggleRoleDetail } = useDetailDrawerContext((v) => ({
    onToggleRoleDetail: v.onToggleRoleDetail,
  }));

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { mutate: deleteRole, isPending: isDeletePending } = useDeleteRole();

  const handleDeleteConfirm = () => {
    deleteRole(
      { namespace: roleNamespace, name: roleName },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onToggleRoleDetail(undefined, undefined);
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
            ariaLabel="Edit Role"
            onClick={() =>
              openTab("modification", { kind: "Role", name: roleName, namespace: roleNamespace })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete Role"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <RoleDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={roleName}
        namespace={roleNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface RoleDetailDrawerProps {
  roleName: string | null;
  roleNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const RoleDrawerBody: FC<
  RoleDetailDrawerProps & {
    roleName: string;
    roleNamespace: string;
    onDataChange: (role: Role | undefined) => void;
  }
> = ({ roleName, roleNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: role, isLoading } = useGetRoleDetail(activeContext, roleNamespace, roleName);
  useCatchForbiddenResource("roles", {
    open,
    resourceName: roleName,
    resourceLabel: "Role",
    namespace: roleNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(role);
  }, [role, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!role) {
    return <ResourceDetailEmptyBody resourceKind="Role" />;
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
        <RoleOverviewTab role={role} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <RoleEventsTab role={role} />}
      </TabsContent>
    </Tabs>
  );
};

export const RoleDetailDrawer: FC<RoleDetailDrawerProps> = ({
  roleName,
  roleNamespace,
  open,
  onClose,
}) => {
  const [role, setRole] = useState<Role | undefined>(undefined);

  const hasData = !!roleName && !!roleNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Role: {role?.Name ?? roleName}</SheetTitle>
        {role && (
          <RoleDrawerCtaButtons
            roleName={role.Name}
            roleNamespace={role.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <RoleDrawerBody
          key={roleName}
          roleName={roleName}
          roleNamespace={roleNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setRole}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Role" />
      )}
    </ResourceDetailDrawer>
  );
};
