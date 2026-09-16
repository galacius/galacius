import {
  BellIcon,
  EmptyState,
  ResourceLink,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonLoader,
  formatTs,
} from "@galacius/design-system";
import { FC } from "react";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { usePagination } from "../../../../shared/hooks/usePagination";
import { useResourceLinks } from "../../../../shared/hooks/useResourceLinks";
import type { Event } from "../api/resources";
import { EventTypeBadge } from "./EventTypeBadge";

interface EventsTableProps {
  events: Event[];
  isLoading?: boolean;
}

export const EventsTable: FC<EventsTableProps> = ({ events, isLoading }) => {
  const { onToggleNamespaceDetail, onToggleEventDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleEventDetail: v.onToggleEventDetail,
  }));

  const resourceLinks = useResourceLinks();

  const {
    visibleItems: visibleEvents,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(events);

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
      <Table containerClassName="flex-1 overflow-y-auto">
        <TableHeader className="z-sticky sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="w-20">Type</TableHead>
            <TableHead>Message</TableHead>
            <TableHead className="w-32">Namespace</TableHead>
            <TableHead className="w-28">Kind</TableHead>
            <TableHead>Resource Name</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="w-16">Count</TableHead>
            <TableHead className="w-16">Age</TableHead>
            <TableHead className="w-20">Last Seen</TableHead>
            <TableHead className="w-36">Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={11}
              columnWidths={[
                "w-[30%]",
                "w-[55%]",
                "w-[70%]",
                "w-[55%]",
                "w-[45%]",
                "w-[60%]",
                "w-[60%]",
                "w-[30%]",
                "w-[30%]",
                "w-[35%]",
                "w-[50%]",
              ]}
            />
          ) : events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="px-0 py-0">
                <EmptyState
                  icon={<BellIcon className="size-8" />}
                  title="No Events"
                  description="No events have been recorded"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleEvents.map((e, i) => (
              <TableRow
                key={`${e.Namespace}/${e.InvolvedObjectKind}/${e.InvolvedObjectName}/${e.CreatedAt}/${e.Name}`}
                className="cursor-pointer"
                onClick={() => onToggleEventDetail(e.Namespace, e.Name)}
              >
                <TableCell className="text-xs text-muted-foreground">
                  {(page - 1) * pageSize + i + 1}
                </TableCell>
                <TableCell>
                  <EventTypeBadge type={e.Type} />
                </TableCell>
                <TableCell className="max-w-2xs truncate font-mono text-xs">{e.Message}</TableCell>
                <TableCell className="text-xs">
                  <ResourceLink
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onToggleNamespaceDetail(e.Namespace);
                    }}
                  >
                    {e.Namespace}
                  </ResourceLink>
                </TableCell>
                <TableCell className="text-xs">{e.InvolvedObjectKind}</TableCell>
                <TableCell className="text-xs">
                  {resourceLinks[e.InvolvedObjectKind.toLowerCase()] ? (
                    <ResourceLink
                      onClick={(ev) => {
                        ev.stopPropagation();
                        resourceLinks[e.InvolvedObjectKind.toLowerCase()](
                          e.Namespace,
                          e.InvolvedObjectName
                        );
                      }}
                    >
                      {e.InvolvedObjectName}
                    </ResourceLink>
                  ) : (
                    e.InvolvedObjectName
                  )}
                </TableCell>
                <TableCell className="max-w-2xs truncate font-mono text-xs">{e.Source}</TableCell>
                <TableCell className="text-xs">{e.Count}</TableCell>
                <TableCell className="text-xs">{e.Age}</TableCell>
                <TableCell className="text-xs">{e.LastSeen}</TableCell>
                <TableCell className="font-mono text-xs">{formatTs(e.CreatedAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {isPaginated && (
        <TablePagination
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalItems={events.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
};
