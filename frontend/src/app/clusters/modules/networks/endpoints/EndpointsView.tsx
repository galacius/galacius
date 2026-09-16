import {
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  MoreVerticalIcon,
  ResourceBulkDeletionButton,
  ResourceDeletionButton,
  ResourceExplanationTooltip,
  ResourceLink,
  ResourceModificationButton,
  RouteIcon,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonLoader,
  cn,
} from "@galacius/design-system";
import { FC, useState } from "react";
import { useGetEndpoints } from "./hooks/data-access/useGetEndpoints";
import { useDeleteEndpoint } from "./hooks/data-mutation/useDeleteEndpoint";
import { useDeleteEndpoints } from "./hooks/data-mutation/useDeleteEndpoints";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { EndpointDeleteConfirmationModal } from "./components/EndpointDeleteConfirmationModal";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface EndpointTableCtaButtonsProps {
  name: string;
  namespace: string;
}

const EndpointTableCtaButtons: FC<EndpointTableCtaButtonsProps> = ({ name, namespace }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteEndpoint, isPending: isDeletePending } = useDeleteEndpoint();

  const handleDeleteConfirm = () => {
    deleteEndpoint({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Actions"
          className="flex size-6 cursor-pointer items-center justify-center rounded-sm hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVerticalIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ResourceModificationButton
            onClick={() => openTab("modification", { kind: "Endpoint", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <EndpointDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        namespace={namespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export const EndpointsView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const [search, setSearch] = useState("");
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleEndpointDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleEndpointDetail: v.onToggleEndpointDetail,
  }));

  const { mutate: deleteEndpoints, isPending: isBulkDeletePending } = useDeleteEndpoints();

  const { data: raw = [], isLoading } = useGetEndpoints({ context: activeContext, namespaces });

  const endpoints = raw
    .filter((ep) => !search || ep.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const {
    visibleItems: visibleEndpoints,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(endpoints, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Endpoints</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-lg" }}
          description="An Endpoints object tracks the IP addresses and ports of the Pods that back a Service."
          docsUrl="https://kubernetes.io/docs/concepts/services-networking/service"
        />
        <span className="text-xs text-muted-foreground">
          {endpoints.length} item{endpoints.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedEndpointIds.size}
            ariaLabel="Delete selected endpoints"
            tooltip="Delete selected Endpoints"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Endpoints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="w-68"
          />
        </div>
      </div>

      <Table containerClassName="flex-1 overflow-y-auto">
        <TableHeader className="z-sticky sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={
                  visibleEndpoints.length > 0 &&
                  visibleEndpoints.every((ep) =>
                    selectedEndpointIds.has(`${ep.Namespace}/${ep.Name}`)
                  )
                }
                indeterminate={
                  visibleEndpoints.some((ep) =>
                    selectedEndpointIds.has(`${ep.Namespace}/${ep.Name}`)
                  ) &&
                  !visibleEndpoints.every((ep) =>
                    selectedEndpointIds.has(`${ep.Namespace}/${ep.Name}`)
                  )
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedEndpointIds);
                    visibleEndpoints.forEach((ep) =>
                      newSelection.add(`${ep.Namespace}/${ep.Name}`)
                    );
                    setSelectedEndpointIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedEndpointIds);
                    visibleEndpoints.forEach((ep) =>
                      newSelection.delete(`${ep.Namespace}/${ep.Name}`)
                    );
                    setSelectedEndpointIds(newSelection);
                  }
                }}
                aria-label="Select all visible endpoints"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead className="w-60">Endpoints</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 4 : 3}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[55%]", "w-[60%]", "w-[30%]"]}
            />
          ) : (
            <>
              {visibleEndpoints.length === 0 && (
                <TableRow>
                  <TableCell colSpan={namespaces.length !== 1 ? 6 : 5} className="px-0 py-0">
                    <EmptyState
                      icon={<RouteIcon className="size-8" />}
                      title="No Endpoints"
                      description="Endpoints are created automatically by Services"
                    />
                  </TableCell>
                </TableRow>
              )}
              {visibleEndpoints.map((ep) => {
                const epId = `${ep.Namespace}/${ep.Name}`;
                const isSelected = selectedEndpointIds.has(epId);
                return (
                  <TableRow
                    key={epId}
                    className={cn(isSelected && "bg-accent/30", "cursor-pointer")}
                    onClick={() => onToggleEndpointDetail(ep.Namespace, ep.Name)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          const newSelection = new Set(selectedEndpointIds);
                          if (isSelected) newSelection.delete(epId);
                          else newSelection.add(epId);
                          setSelectedEndpointIds(newSelection);
                        }}
                        aria-label={`Select endpoint ${ep.Name}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ep.Name}</TableCell>
                    {namespaces.length !== 1 && (
                      <TableCell className="text-xs">
                        <ResourceLink
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleNamespaceDetail(ep.Namespace);
                          }}
                        >
                          {ep.Namespace}
                        </ResourceLink>
                      </TableCell>
                    )}
                    <TableCell className="max-w-60 font-mono text-xs wrap-break-word whitespace-normal">
                      {ep.Endpoints === "<none>" ? (
                        <span className="text-muted-foreground">&lt;none&gt;</span>
                      ) : (
                        ep.Endpoints
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{ep.Age}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <EndpointTableCtaButtons name={ep.Name} namespace={ep.Namespace} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </>
          )}
        </TableBody>
      </Table>

      {isPaginated && (
        <TablePagination
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalItems={endpoints.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedEndpointIds.size > 0 && (
        <EndpointDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedEndpointIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedEndpointIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteEndpoints(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedEndpointIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
