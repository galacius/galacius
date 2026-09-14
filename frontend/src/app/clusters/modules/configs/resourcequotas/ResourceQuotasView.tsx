import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  GaugeIcon,
  MoreVerticalIcon,
  ResourceBulkDeletionButton,
  ResourceCreationButton,
  ResourceDeletionButton,
  ResourceExplanationTooltip,
  ResourceLink,
  ResourceModificationButton,
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
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { ResourceQuotaCreationModal } from "./components/ResourceQuotaCreationModal";
import { ResourceQuotaDeleteConfirmationModal } from "./components/ResourceQuotaDeleteConfirmationModal";
import { useGetResourceQuotas } from "./hooks/data-access/useGetResourceQuotas";
import { useDeleteResourceQuota } from "./hooks/data-mutation/useDeleteResourceQuota";
import { useDeleteResourceQuotas } from "./hooks/data-mutation/useDeleteResourceQuotas";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface ResourceQuotaTableCtaButtonsProps {
  name: string;
  namespace: string;
}

const ResourceQuotaTableCtaButtons: FC<ResourceQuotaTableCtaButtonsProps> = ({
  name,
  namespace,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteQuota, isPending: isDeletePending } = useDeleteResourceQuota();

  const handleDeleteConfirm = () => {
    deleteQuota({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
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
            onClick={() => openTab("modification", { kind: "ResourceQuota", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <ResourceQuotaDeleteConfirmationModal
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

export const ResourceQuotasView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedResourceQuotaIds, setSelectedResourceQuotaIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleResourceQuotaDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleResourceQuotaDetail: v.onToggleResourceQuotaDetail,
  }));

  const { mutate: deleteResourceQuotas, isPending: isBulkDeletePending } =
    useDeleteResourceQuotas();

  const { data: raw = [], isLoading } = useGetResourceQuotas({
    context: activeContext,
    namespaces,
  });

  const quotas = raw
    .filter((rq) => !search || rq.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const {
    visibleItems: visibleQuotas,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(quotas, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Resource Quotas</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          description="A ResourceQuota limits aggregate resource consumption, such as CPU, memory, and object counts, within a namespace."
          docsUrl="https://kubernetes.io/docs/concepts/policy/resource-quotas"
        />
        <span className="text-xs text-muted-foreground">
          {quotas.length} item{quotas.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedResourceQuotaIds.size}
            ariaLabel="Delete selected resource quotas"
            tooltip="Delete selected Resource Quotas"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <ResourceCreationButton
            ariaLabel="Create ResourceQuota"
            tooltip="Create Resource Quota"
            onClick={() => setIsCreateOpen(true)}
          />
          <SearchInput
            placeholder="Search Resource Quotas..."
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
                  visibleQuotas.length > 0 &&
                  visibleQuotas.every((rq) =>
                    selectedResourceQuotaIds.has(`${rq.Namespace}/${rq.Name}`)
                  )
                }
                indeterminate={
                  visibleQuotas.some((rq) =>
                    selectedResourceQuotaIds.has(`${rq.Namespace}/${rq.Name}`)
                  ) &&
                  !visibleQuotas.every((rq) =>
                    selectedResourceQuotaIds.has(`${rq.Namespace}/${rq.Name}`)
                  )
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedResourceQuotaIds);
                    visibleQuotas.forEach((rq) => newSelection.add(`${rq.Namespace}/${rq.Name}`));
                    setSelectedResourceQuotaIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedResourceQuotaIds);
                    visibleQuotas.forEach((rq) =>
                      newSelection.delete(`${rq.Namespace}/${rq.Name}`)
                    );
                    setSelectedResourceQuotaIds(newSelection);
                  }
                }}
                aria-label="Select all visible resource quotas"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 3 : 2}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[55%]", "w-[30%]"]}
            />
          ) : visibleQuotas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 5 : 4} className="px-0 py-0">
                <EmptyState
                  icon={<GaugeIcon className="size-8" />}
                  title="No Resource Quotas"
                  description="Create a Resource Quota to constrain namespace resource usage"
                  action={
                    <Button variant="default" size="default" onClick={() => setIsCreateOpen(true)}>
                      Create Resource Quota
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleQuotas.map((rq) => {
              const rqId = `${rq.Namespace}/${rq.Name}`;
              const isSelected = selectedResourceQuotaIds.has(rqId);
              return (
                <TableRow
                  key={rqId}
                  className={cn(isSelected && "bg-accent/30")}
                  onClick={() => onToggleResourceQuotaDetail(rq.Namespace, rq.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedResourceQuotaIds);
                        if (isSelected) newSelection.delete(rqId);
                        else newSelection.add(rqId);
                        setSelectedResourceQuotaIds(newSelection);
                      }}
                      aria-label={`Select resource quota ${rq.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{rq.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(rq.Namespace);
                        }}
                      >
                        {rq.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{rq.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ResourceQuotaTableCtaButtons name={rq.Name} namespace={rq.Namespace} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {isPaginated && (
        <TablePagination
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalItems={quotas.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedResourceQuotaIds.size > 0 && (
        <ResourceQuotaDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedResourceQuotaIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedResourceQuotaIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteResourceQuotas(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedResourceQuotaIds(new Set());
                },
              }
            );
          }}
        />
      )}

      <ResourceQuotaCreationModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        activeNamespace={namespaces.length === 1 ? namespaces[0] : ""}
        activeContext={activeContext}
      />
    </div>
  );
};
