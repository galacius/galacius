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
import { FC, Fragment, useEffect, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { StorageClass } from "../api/resources";
import { useGetStorageClassByName } from "../hooks/data-access/useGetStorageClassByName";
import { useDeleteStorageClass } from "../hooks/data-mutation/useDeleteStorageClass";
import { StorageClassDeleteConfirmationModal } from "./StorageClassDeleteConfirmationModal";

const StorageClassOverviewTab: FC<{ sc: StorageClass }> = ({ sc }) => {
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {sc.Age} ago ({sc.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{sc.Name}</span>

        {Object.keys(sc.Labels ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(sc.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {Object.keys(sc.Annotations ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(sc.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {(sc.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {sc.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        <div className="col-span-2 flex items-center gap-2 pt-1">
          <span className="text-caption shrink-0 text-muted-foreground">Storage</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <span className="text-h3 text-muted-foreground">Provisioner</span>
        <Badge variant="secondary" className="font-mono text-xs">
          {sc.Provisioner}
        </Badge>

        <span className="text-h3 text-muted-foreground">Volume Binding Mode</span>
        <span className="text-body">{sc.VolumeBindingMode || "—"}</span>

        <span className="text-h3 text-muted-foreground">Reclaim Policy</span>
        <span className="text-body">{sc.ReclaimPolicy || "—"}</span>

        <span className="text-h3 text-muted-foreground">Default</span>
        <span className="text-body">{sc.Default ? "Yes" : "No"}</span>

        <span className="text-h3 text-muted-foreground">Mount Options</span>
        <span>
          {(sc.MountOptions ?? []).length > 0 ? (
            <span className="text-body font-mono">{sc.MountOptions.join(", ")}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>

        {Object.keys(sc.Parameters ?? {}).length > 0 && (
          <>
            <div className="col-span-2 flex items-center gap-2 pt-1">
              <span className="text-caption shrink-0 text-muted-foreground">Parameters</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
            {Object.entries(sc.Parameters).map(([k, v]) => (
              <Fragment key={k}>
                <span className="text-caption font-mono text-muted-foreground">{k}</span>
                <span className="text-body font-mono">{v}</span>
              </Fragment>
            ))}
          </>
        )}
      </div>
    </ScrollArea>
  );
};

const StorageClassEventsTab: FC<{ sc: StorageClass }> = ({ sc }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [] });
  const scEvents = events.filter(
    (e) => e.InvolvedObjectKind.toLowerCase() === "storageclass" && e.InvolvedObjectName === sc.Name
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={scEvents} />
    </ScrollArea>
  );
};

interface StorageClassDrawerCtaButtonsProps {
  name: string;
  onDeleted: () => void;
}

const StorageClassDrawerCtaButtons: FC<StorageClassDrawerCtaButtonsProps> = ({
  name,
  onDeleted,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteStorageClass, isPending: isDeletePending } = useDeleteStorageClass();

  const handleDeleteConfirm = () => {
    deleteStorageClass(
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
    <>
      <ButtonGroup>
        <TooltipProvider>
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit StorageClass"
            onClick={() => openTab("modification", { kind: "StorageClass", name })}
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete StorageClass"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <StorageClassDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface StorageClassDetailDrawerProps {
  name: string | null;
  open: boolean;
  onClose: () => void;
}

const StorageClassDrawerBody: FC<
  StorageClassDetailDrawerProps & {
    name: string;
    onDataChange: (sc: StorageClass | undefined) => void;
  }
> = ({ name, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: sc, isLoading } = useGetStorageClassByName(activeContext, name);
  useCatchForbiddenResource("storageclasses", {
    open,
    resourceName: name,
    resourceLabel: "Storage Class",
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(sc?.Name ? sc : undefined);
  }, [sc, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!sc?.Name) {
    return <ResourceDetailEmptyBody resourceKind="StorageClass" />;
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
        <StorageClassOverviewTab sc={sc} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <StorageClassEventsTab sc={sc} />}
      </TabsContent>
    </Tabs>
  );
};

export const StorageClassDetailDrawer: FC<StorageClassDetailDrawerProps> = ({
  name,
  open,
  onClose,
}) => {
  const [sc, setSc] = useState<StorageClass | undefined>(undefined);

  const hasData = !!name;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Storage Class: {sc?.Name ?? name}</SheetTitle>
        {sc && <StorageClassDrawerCtaButtons name={sc.Name} onDeleted={onClose} />}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <StorageClassDrawerBody
          key={name}
          name={name}
          open={open}
          onClose={onClose}
          onDataChange={setSc}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Storage Class" />
      )}
    </ResourceDetailDrawer>
  );
};
