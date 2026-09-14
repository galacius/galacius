import {
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  HardDriveIcon,
  MoreVerticalIcon,
  ResourceBulkDeletionButton,
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
import { FC, useMemo, useState } from "react";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { PersistentVolumeClaimDeleteConfirmationModal } from "./components/PersistentVolumeClaimDeleteConfirmationModal";
import { PersistentVolumeClaimStatusBadge } from "./components/PersistentVolumeClaimStatusBadge";
import { useGetPersistentVolumeClaims } from "./hooks/data-access/useGetPersistentVolumeClaims";
import { useDeletePersistentVolumeClaim } from "./hooks/data-mutation/useDeletePersistentVolumeClaim";
import { useDeletePersistentVolumeClaims } from "./hooks/data-mutation/useDeletePersistentVolumeClaims";

interface PersistentVolumeClaimTableCtaButtonsProps {
  name: string;
  namespace: string;
}

const PersistentVolumeClaimTableCtaButtons: FC<PersistentVolumeClaimTableCtaButtonsProps> = ({
  name,
  namespace,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deletePersistentVolumeClaim, isPending: isDeletePending } =
    useDeletePersistentVolumeClaim();

  const handleDeleteConfirm = () => {
    deletePersistentVolumeClaim(
      { namespace, name },
      { onSuccess: () => setShowDeleteModal(false) }
    );
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
            onClick={() =>
              openTab("modification", { kind: "PersistentVolumeClaim", name, namespace })
            }
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <PersistentVolumeClaimDeleteConfirmationModal
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

export const PersistentVolumeClaimsView: FC = () => {
  const { activeContext, namespaces } = useMainLayoutContext();
  const {
    onToggleNamespaceDetail,
    onTogglePersistentVolumeClaimDetail,
    onToggleStorageClassDetail,
  } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onTogglePersistentVolumeClaimDetail: v.onTogglePersistentVolumeClaimDetail,
    onToggleStorageClassDetail: v.onToggleStorageClassDetail,
  }));

  const openBrowserURL = useOpenBrowserURL();

  const [search, setSearch] = useState("");
  const [selectedPVCKeys, setSelectedPVCKeys] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deletePersistentVolumeClaims, isPending: isBulkDeletePending } =
    useDeletePersistentVolumeClaims();

  const { data: raw = [], isLoading } = useGetPersistentVolumeClaims({
    context: activeContext,
    namespaces,
  });

  const pvcs = useMemo(
    () =>
      raw
        .filter((p) => !search || p.Name.toLowerCase().includes(search.toLowerCase()))
        .toSorted((a, b) => a.Name.localeCompare(b.Name)),
    [raw, search]
  );

  const {
    visibleItems: visiblePVCs,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(pvcs, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Persistent Volume Claims</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-xl" }}
          description="A PersistentVolumeClaim is a request for storage by a user, which Kubernetes binds to a matching PersistentVolume."
          docsUrl="https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims"
        />
        <span className="text-xs text-muted-foreground">
          {pvcs.length} item{pvcs.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedPVCKeys.size}
            ariaLabel="Delete selected persistent volume claims"
            tooltip="Delete selected Persistent Volume Claims"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Persistent Volume Claims..."
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
                  visiblePVCs.length > 0 &&
                  visiblePVCs.every((pvc) => selectedPVCKeys.has(`${pvc.Namespace}/${pvc.Name}`))
                }
                indeterminate={
                  visiblePVCs.some((pvc) => selectedPVCKeys.has(`${pvc.Namespace}/${pvc.Name}`)) &&
                  !visiblePVCs.every((pvc) => selectedPVCKeys.has(`${pvc.Namespace}/${pvc.Name}`))
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedPVCKeys);
                    visiblePVCs.forEach((pvc) => newSelection.add(`${pvc.Namespace}/${pvc.Name}`));
                    setSelectedPVCKeys(newSelection);
                  } else {
                    const newSelection = new Set(selectedPVCKeys);
                    visiblePVCs.forEach((pvc) =>
                      newSelection.delete(`${pvc.Namespace}/${pvc.Name}`)
                    );
                    setSelectedPVCKeys(newSelection);
                  }
                }}
                aria-label="Select all visible persistent volume claims"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Storage Class</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Pods</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 6 : 5}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[55%]", "w-[35%]", "w-[30%]", "w-[45%]", "w-[30%]"]}
            />
          ) : visiblePVCs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 9 : 8} className="px-0 py-0">
                <EmptyState
                  icon={<HardDriveIcon className="size-8" />}
                  title="No Persistent Volume Claims"
                  description="Create a Persistent Volume Claim to request storage"
                />
              </TableCell>
            </TableRow>
          ) : (
            visiblePVCs.map((p) => {
              const key = `${p.Namespace}/${p.Name}`;
              const isSelected = selectedPVCKeys.has(key);
              return (
                <TableRow
                  key={key}
                  className={cn(isSelected && "bg-accent/30")}
                  onClick={() => onTogglePersistentVolumeClaimDetail(p.Namespace, p.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedPVCKeys);
                        if (isSelected) newSelection.delete(key);
                        else newSelection.add(key);
                        setSelectedPVCKeys(newSelection);
                      }}
                      aria-label={`Select persistent volume claim ${p.Namespace}/${p.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(p.Namespace);
                        }}
                      >
                        {p.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="text-xs">
                    {p.StorageClass ? (
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStorageClassDetail(p.StorageClass);
                        }}
                      >
                        {p.StorageClass}
                      </ResourceLink>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.Size}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs">{p.Pods}</TableCell>
                  <TableCell className="text-xs">{p.Age}</TableCell>
                  <TableCell>
                    <PersistentVolumeClaimStatusBadge status={p.Status} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <PersistentVolumeClaimTableCtaButtons name={p.Name} namespace={p.Namespace} />
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
          totalItems={pvcs.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedPVCKeys.size > 0 && (
        <PersistentVolumeClaimDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedPVCKeys).map((key) => {
            const [ns, name] = key.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            deletePersistentVolumeClaims(
              {
                items: Array.from(selectedPVCKeys).map((key) => {
                  const [ns, name] = key.split("/");
                  return { namespace: ns, name };
                }),
              },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedPVCKeys(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
