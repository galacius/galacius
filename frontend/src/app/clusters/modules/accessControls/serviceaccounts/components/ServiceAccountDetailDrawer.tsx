import {
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
import { FC, Fragment, useEffect, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { ServiceAccount } from "../api/resources";
import { useGetServiceAccountDetail } from "../hooks/data-access/useGetServiceAccountDetail";
import { useDeleteServiceAccount } from "../hooks/data-mutation/useDeleteServiceAccount";
import { ServiceAccountDeleteConfirmationModal } from "./ServiceAccountDeleteConfirmationModal";

const ServiceAccountOverviewTab: FC<{ sa: ServiceAccount }> = ({ sa }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {sa.Age} ago ({sa.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{sa.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(sa.Namespace)}>
          {sa.Namespace}
        </ResourceLink>

        <div className="col-span-2 flex items-center gap-2 pt-1">
          <span className="text-h3 shrink-0 text-muted-foreground">Mountable Secrets</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {(sa.Secrets ?? []).length === 0 ? (
          <span className="col-span-2 text-muted-foreground">—</span>
        ) : (
          (sa.Secrets ?? []).map((secret) => (
            <Fragment key={secret}>
              <span />
              <Badge variant="secondary" className="w-fit font-mono text-xs">
                {secret}
              </Badge>
            </Fragment>
          ))
        )}
      </div>
    </ScrollArea>
  );
};

const ServiceAccountEventsTab: FC<{ sa: ServiceAccount }> = ({ sa }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [sa.Namespace],
  });
  const saEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "serviceaccount" &&
      e.InvolvedObjectName === sa.Name &&
      e.Namespace === sa.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={saEvents} />
    </ScrollArea>
  );
};

interface ServiceAccountDrawerCtaButtonsProps {
  saName: string;
  saNamespace: string;
  onClose: () => void;
}

const ServiceAccountDrawerCtaButtons: FC<ServiceAccountDrawerCtaButtonsProps> = ({
  saName,
  saNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteServiceAccount, isPending: isDeletePending } = useDeleteServiceAccount();

  const handleDeleteConfirm = () => {
    deleteServiceAccount(
      { namespace: saNamespace, name: saName },
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
            ariaLabel="Edit ServiceAccount"
            onClick={() =>
              openTab("modification", {
                kind: "ServiceAccount",
                name: saName,
                namespace: saNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete ServiceAccount"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <ServiceAccountDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={saName}
        namespace={saNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface ServiceAccountDetailDrawerProps {
  saName: string | null;
  saNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const ServiceAccountDrawerBody: FC<
  ServiceAccountDetailDrawerProps & {
    saName: string;
    saNamespace: string;
    onDataChange: (sa: ServiceAccount | undefined) => void;
  }
> = ({ saName, saNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: sa, isLoading } = useGetServiceAccountDetail(activeContext, saNamespace, saName);
  useCatchForbiddenResource("serviceaccounts", {
    open,
    resourceName: saName,
    resourceLabel: "ServiceAccount",
    namespace: saNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(sa);
  }, [sa, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!sa) {
    return <ResourceDetailEmptyBody resourceKind="ServiceAccount" />;
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
        <ServiceAccountOverviewTab sa={sa} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <ServiceAccountEventsTab sa={sa} />}
      </TabsContent>
    </Tabs>
  );
};

export const ServiceAccountDetailDrawer: FC<ServiceAccountDetailDrawerProps> = ({
  saName,
  saNamespace,
  open,
  onClose,
}) => {
  const [sa, setSa] = useState<ServiceAccount | undefined>(undefined);

  const hasData = !!saName && !!saNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Service Account: {sa?.Name ?? saName}</SheetTitle>
        {sa && (
          <ServiceAccountDrawerCtaButtons
            saName={sa.Name}
            saNamespace={sa.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <ServiceAccountDrawerBody
          key={`${saNamespace}/${saName}`}
          saName={saName}
          saNamespace={saNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setSa}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Service Account" />
      )}
    </ResourceDetailDrawer>
  );
};
