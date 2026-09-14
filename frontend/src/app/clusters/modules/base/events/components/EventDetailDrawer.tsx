import {
  LoadingSpinner,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
  ResourceLink,
  ScrollArea,
  Separator,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatTs,
} from "@galacius/design-system";
import { FC } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useResourceLinks } from "../../../../shared/hooks/useResourceLinks";
import { useGetEventDetail } from "../hooks/data-access/useGetEventDetail";
import { EventTypeBadge } from "./EventTypeBadge";

interface EventDetailDrawerProps {
  eventName: string | null;
  eventNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const EventDrawerBody: FC<
  EventDetailDrawerProps & {
    eventName: string;
    eventNamespace: string;
  }
> = ({ eventName, eventNamespace, open, onClose }) => {
  const { activeContext } = useMainLayoutContext();
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  const resourceLinks = useResourceLinks();

  const { data: event, isLoading } = useGetEventDetail(activeContext, eventNamespace, eventName);
  useCatchForbiddenResource("events", {
    open,
    resourceName: eventName,
    resourceLabel: "Event",
    namespace: eventNamespace,
    onForbiddenDetected: onClose,
  });

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!event) {
    return <ResourceDetailEmptyBody resourceKind="Event" />;
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-0">
        {/* Detail grid */}
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
          <span className="text-h3 text-muted-foreground">Created</span>
          <span className="text-body font-mono">
            {event.Age} ago ({formatTs(event.CreatedAt)})
          </span>

          <span className="text-h3 text-muted-foreground">Name</span>
          <span className="text-body font-mono">{event.Name}</span>

          <span className="text-h3 text-muted-foreground">Namespace</span>
          <ResourceLink onClick={() => onToggleNamespaceDetail(event.Namespace)}>
            {event.Namespace}
          </ResourceLink>

          {(event.ManagedFields ?? []).length > 0 && (
            <>
              <span className="text-h3 self-start pt-0.5 text-muted-foreground">
                Managed Fields
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                {event.ManagedFields.map((mf) => (
                  <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
                ))}
              </div>
            </>
          )}

          <span className="text-h3 text-muted-foreground">Message</span>
          <span className="text-body overflow-x-auto font-mono wrap-break-word">
            {event.Message}
          </span>

          <span className="text-h3 text-muted-foreground">Reason</span>
          <span className="text-body font-mono">{event.Reason}</span>

          <span className="text-h3 text-muted-foreground">Source</span>
          <span className="text-body font-mono">{event.Source}</span>

          <span className="text-h3 text-muted-foreground">First seen</span>
          {event.FirstSeen ? (
            <span className="text-body font-mono">
              {event.FirstSeen} ago ({formatTs(event.FirstSeenAt)})
            </span>
          ) : (
            <span className="font-mono text-muted-foreground">—</span>
          )}

          <span className="text-h3 text-muted-foreground">Last seen</span>
          {event.LastSeen ? (
            <span className="text-body font-mono">
              {event.LastSeen} ago ({formatTs(event.LastSeenAt)})
            </span>
          ) : (
            <span className="font-mono text-muted-foreground">—</span>
          )}

          <span className="text-h3 text-muted-foreground">Count</span>
          <span className="text-body font-mono">{event.Count}</span>

          <span className="text-h3 text-muted-foreground">Type</span>
          <EventTypeBadge type={event.Type} />
        </div>

        <Separator />

        {/* Involved object section */}
        <SectionDivider
          label="Involved object"
          className="border-y-0 bg-muted/50 tracking-wide uppercase"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Namespace</TableHead>
              <TableHead className="text-xs">Kind</TableHead>
              <TableHead className="text-xs">Field Path</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs">
                {resourceLinks[event.InvolvedObjectKind.toLowerCase()] ? (
                  <ResourceLink
                    onClick={() =>
                      resourceLinks[event.InvolvedObjectKind.toLowerCase()](
                        event.InvolvedObjectNamespace || event.Namespace,
                        event.InvolvedObjectName
                      )
                    }
                  >
                    {event.InvolvedObjectName}
                  </ResourceLink>
                ) : (
                  <span className="font-mono">{event.InvolvedObjectName}</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                <ResourceLink
                  onClick={() =>
                    onToggleNamespaceDetail(event.InvolvedObjectNamespace || event.Namespace)
                  }
                >
                  {event.InvolvedObjectNamespace || event.Namespace}
                </ResourceLink>
              </TableCell>
              <TableCell className="text-xs">{event.InvolvedObjectKind}</TableCell>
              <TableCell className="text-xs">
                {event.InvolvedObjectFieldPath ? (
                  <span className="font-mono">{event.InvolvedObjectFieldPath}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
};

export const EventDetailDrawer: FC<EventDetailDrawerProps> = ({
  eventName,
  eventNamespace,
  open,
  onClose,
}) => {
  const hasData = !!eventName && !!eventNamespace;
  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Event: {eventName}</SheetTitle>
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <EventDrawerBody
          key={eventName}
          eventName={eventName}
          eventNamespace={eventNamespace}
          open={open}
          onClose={onClose}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Event" />
      )}
    </ResourceDetailDrawer>
  );
};
