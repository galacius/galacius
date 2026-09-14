import {
  ResourceCell,
  ResourceLink,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@galacius/design-system";
import { FC } from "react";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { usePagination } from "../../../../shared/hooks/usePagination";
import type { Pod } from "../api/resources";
import { PodStatusBadge } from "./PodStatusBadge";

interface PodSimpleTableProps {
  pods: Pod[];
}

export const PodSimpleTable: FC<PodSimpleTableProps> = ({ pods }) => {
  const { onToggleNamespaceDetail, onTogglePodDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onTogglePodDetail: v.onTogglePodDetail,
  }));

  const {
    visibleItems: visiblePods,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(pods);

  return (
    <div className="flex h-full flex-1 flex-col gap-2 overflow-y-auto">
      <Table containerClassName="flex-1 overflow-y-auto">
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Namespace</TableHead>
            <TableHead className="text-xs">Ready</TableHead>
            <TableHead className="text-xs">CPU</TableHead>
            <TableHead className="text-xs">Memory</TableHead>
            <TableHead className="text-xs">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pods.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                Item list is empty
              </TableCell>
            </TableRow>
          ) : (
            visiblePods.map((p) => (
              <TableRow key={`${p.Namespace}/${p.Name}`}>
                <TableCell className="max-w-40 truncate font-mono text-xs">
                  <ResourceLink
                    truncate
                    truncateTextClassName="max-w-40"
                    onClick={() => onTogglePodDetail(p.Namespace, p.Name)}
                  >
                    {p.Name}
                  </ResourceLink>
                </TableCell>
                <TableCell className="text-xs">
                  <ResourceLink truncate onClick={() => onToggleNamespaceDetail(p.Namespace)}>
                    {p.Namespace}
                  </ResourceLink>
                </TableCell>
                <TableCell className="text-xs">{p.Ready}</TableCell>
                <TableCell>
                  <ResourceCell label={p.CPU} percent={p.CPUPercent} />
                </TableCell>
                <TableCell>
                  <ResourceCell label={p.Memory} percent={p.MemPercent} />
                </TableCell>
                <TableCell>
                  <PodStatusBadge status={p.Status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {isPaginated && (
        <div className="px-2 pb-2">
          <TablePagination
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            totalItems={pods.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
};
