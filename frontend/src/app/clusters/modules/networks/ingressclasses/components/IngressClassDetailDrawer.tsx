import {
  AnnotationBadge,
  Button,
  ButtonGroup,
  LoadingSpinner,
  ResourceDeletionButton,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
  ResourceModificationButton,
  ScrollArea,
  SheetTitle,
  StarIcon,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@galacius/design-system";
import { FC, useEffect, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { IngressClass } from "../api/resources";
import { useGetIngressClassDetail } from "../hooks/data-access/useGetIngressClassDetail";
import { useDeleteIngressClass } from "../hooks/data-mutation/useDeleteIngressClass";
import { useSetIngressClassAsDefault } from "../hooks/data-mutation/useSetIngressClassAsDefault";
import { useUnsetIngressClassAsDefault } from "../hooks/data-mutation/useUnsetIngressClassAsDefault";
import { IngressClassDeleteConfirmationModal } from "./IngressClassDeleteConfirmationModal";

const IngressClassOverviewTab: FC<{ ic: IngressClass }> = ({ ic }) => {
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {ic.Age} ago ({ic.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{ic.Name}</span>

        <span className="text-h3 text-muted-foreground">Labels</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(ic.Labels ?? {}).length > 0 ? (
            Object.entries(ic.Labels).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Annotations</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(ic.Annotations ?? {}).length > 0 ? (
            Object.entries(ic.Annotations).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Controller</span>
        <div className="flex flex-wrap gap-1">
          <AnnotationBadge label={ic.Controller} />
        </div>
      </div>
    </ScrollArea>
  );
};

interface IngressClassDrawerCtaButtonsProps {
  ic: IngressClass;
  onClose: () => void;
}

const IngressClassDrawerCtaButtons: FC<IngressClassDrawerCtaButtonsProps> = ({ ic, onClose }) => {
  const { mutate: setAsDefault, isPending: isSettingDefault } = useSetIngressClassAsDefault();
  const { mutate: unsetAsDefault, isPending: isUnsettingDefault } = useUnsetIngressClassAsDefault();
  const isPending = isSettingDefault || isUnsettingDefault;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteSingle, isPending: isDeletePending } = useDeleteIngressClass();

  const handleConfirmDelete = () => {
    deleteSingle(
      { name: ic.Name },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onClose();
        },
      }
    );
  };

  return (
    <TooltipProvider>
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={
                  ic.IsDefault ? "Unset default IngressClass" : "Set as default IngressClass"
                }
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() =>
                  ic.IsDefault
                    ? unsetAsDefault(ic.Name, { onSuccess: onClose })
                    : setAsDefault(ic.Name, { onSuccess: onClose })
                }
              >
                <StarIcon fill={ic.IsDefault ? "currentColor" : "none"} className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent side="bottom">
            {ic.IsDefault ? "Unset default" : "Set as default"}
          </TooltipContent>
        </Tooltip>
        <ResourceModificationButton
          mode="icon-button"
          ariaLabel="Edit IngressClass"
          onClick={() => openTab("modification", { kind: "IngressClass", name: ic.Name })}
        />
        <ResourceDeletionButton
          mode="icon-button"
          ariaLabel="Delete IngressClass"
          onClick={() => setShowDeleteModal(true)}
        />
      </ButtonGroup>

      <IngressClassDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={ic.Name}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />
    </TooltipProvider>
  );
};

const IngressClassEventsTab: FC<{ ic: IngressClass }> = ({ ic }) => {
  const { activeContext } = useMainLayoutContext();
  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [] });
  const icEvents = events.filter(
    (e) => e.InvolvedObjectKind.toLowerCase() === "ingressclass" && e.InvolvedObjectName === ic.Name
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={icEvents} />
    </ScrollArea>
  );
};

interface IngressClassDetailDrawerProps {
  ingressClassName: string | null;
  open: boolean;
  onClose: () => void;
}

const IngressClassDrawerBody: FC<
  IngressClassDetailDrawerProps & {
    ingressClassName: string;
    onDataChange: (ic: IngressClass | undefined) => void;
  }
> = ({ ingressClassName, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: ic, isLoading } = useGetIngressClassDetail(activeContext, ingressClassName);
  useCatchForbiddenResource("ingressclasses", {
    open,
    resourceName: ingressClassName,
    resourceLabel: "IngressClass",
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(ic);
  }, [ic, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!ic) {
    return <ResourceDetailEmptyBody resourceKind="IngressClass" />;
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
        <IngressClassOverviewTab ic={ic} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <IngressClassEventsTab ic={ic} />}
      </TabsContent>
    </Tabs>
  );
};

export const IngressClassDetailDrawer: FC<IngressClassDetailDrawerProps> = ({
  ingressClassName,
  open,
  onClose,
}) => {
  const [ic, setIc] = useState<IngressClass | undefined>(undefined);

  const hasData = !!ingressClassName;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Ingress Class: {ic?.Name ?? ingressClassName}</SheetTitle>
        {ic && <IngressClassDrawerCtaButtons ic={ic} onClose={onClose} />}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <IngressClassDrawerBody
          key={ingressClassName}
          ingressClassName={ingressClassName}
          open={open}
          onClose={onClose}
          onDataChange={setIc}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Ingress Class" />
      )}
    </ResourceDetailDrawer>
  );
};
