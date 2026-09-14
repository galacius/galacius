import {
  AnnotationBadge,
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
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../events/components/EventsTable";
import { useGetEvents } from "../../events/hooks/data-access/useGetEvents";
import type { Namespace } from "../api/resources";
import { useGetNamespaceDetail } from "../hooks/data-access/useGetNamespaceDetail";
import { useDeleteNamespace } from "../hooks/data-mutation/useDeleteNamespace";
import { NamespaceDeleteConfirmationModal } from "./NamespaceDeleteConfirmationModal";
import { NamespaceStatusBadge } from "./NamespaceStatusBadge";

const NamespaceOverviewTab: FC<{ ns: Namespace }> = ({ ns }) => {
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {ns.Age} ago ({ns.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{ns.Name}</span>

        <span className="text-h3 text-muted-foreground">Labels</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(ns.Labels ?? {}).length > 0 ? (
            Object.entries(ns.Labels).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        {(ns.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {ns.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Status</span>
        <NamespaceStatusBadge status={ns.Status} />

        <span className="text-h3 text-muted-foreground">Resource Quotas</span>
        <span className="text-caption text-muted-foreground">
          {ns.ResourceQuotas?.length > 0 ? ns.ResourceQuotas.join(", ") : "—"}
        </span>

        <span className="text-h3 text-muted-foreground">Limit Ranges</span>
        <span className="text-caption text-muted-foreground">
          {ns.LimitRanges?.length > 0 ? ns.LimitRanges.join(", ") : "—"}
        </span>
      </div>
    </ScrollArea>
  );
};

interface NamespaceDrawerCtaButtonsProps {
  name: string;
  onDeleted: () => void;
}

const NamespaceDrawerCtaButtons: FC<NamespaceDrawerCtaButtonsProps> = ({ name, onDeleted }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { mutate: deleteNamespace, isPending: isDeletePending } = useDeleteNamespace();
  const { openTab } = useUnifiedTray();

  const handleDeleteConfirm = () => {
    deleteNamespace(
      { name },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onDeleted();
        },
      }
    );
  };

  return (
    <TooltipProvider>
      <ButtonGroup>
        <ResourceModificationButton
          mode="icon-button"
          ariaLabel="Edit Namespace"
          onClick={() => openTab("modification", { kind: "Namespace", name })}
        />
        <ResourceDeletionButton
          mode="icon-button"
          ariaLabel="Delete Namespace"
          disabled={isDeletePending}
          onClick={() => setShowDeleteModal(true)}
        />
      </ButtonGroup>

      <NamespaceDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </TooltipProvider>
  );
};

const NamespaceEventsTab: FC<{ ns: Namespace }> = ({ ns }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [] });
  const nsEvents = events.filter(
    (e) => e.InvolvedObjectKind.toLowerCase() === "namespace" && e.InvolvedObjectName === ns.Name
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={nsEvents} />
    </ScrollArea>
  );
};

interface NamespaceDetailDrawerProps {
  namespaceName: string | null;
  open: boolean;
  onClose: () => void;
}

const NamespaceDrawerBody: FC<
  NamespaceDetailDrawerProps & {
    namespaceName: string;
    onDataChange: (ns: Namespace | undefined) => void;
  }
> = ({ namespaceName, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: ns, isLoading } = useGetNamespaceDetail(activeContext, namespaceName);
  useCatchForbiddenResource("namespaces", {
    open,
    resourceName: namespaceName,
    resourceLabel: "Namespace",
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(ns);
  }, [ns, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!ns) {
    return <ResourceDetailEmptyBody resourceKind="Namespace" />;
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
        <NamespaceOverviewTab ns={ns} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <NamespaceEventsTab ns={ns} />}
      </TabsContent>
    </Tabs>
  );
};

export const NamespaceDetailDrawer: FC<NamespaceDetailDrawerProps> = ({
  namespaceName,
  open,
  onClose,
}) => {
  const [ns, setNs] = useState<Namespace | undefined>(undefined);

  const hasData = !!namespaceName;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Namespace: {ns?.Name ?? namespaceName}</SheetTitle>
        {ns && <NamespaceDrawerCtaButtons name={ns.Name} onDeleted={onClose} />}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <NamespaceDrawerBody
          key={namespaceName}
          namespaceName={namespaceName}
          open={open}
          onClose={onClose}
          onDataChange={setNs}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Namespace" />
      )}
    </ResourceDetailDrawer>
  );
};
