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
  ResourceModificationButton,
  SaveIcon,
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
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { StorageClassDeleteConfirmationModal } from "./components/StorageClassDeleteConfirmationModal";
import { useGetStorageClasses } from "./hooks/data-access/useGetStorageClasses";
import { useDeleteStorageClass } from "./hooks/data-mutation/useDeleteStorageClass";
import { useDeleteStorageClasses } from "./hooks/data-mutation/useDeleteStorageClasses";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

const StorageClassTableCtaButtons: FC<{ name: string }> = ({ name }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteStorageClass, isPending: isDeletePending } = useDeleteStorageClass();

  const handleDeleteConfirm = () => {
    deleteStorageClass({ name }, { onSuccess: () => setShowDeleteModal(false) });
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
            onClick={() => openTab("modification", { kind: "StorageClass", name })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

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

export const StorageClassesView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const { activeContext } = useMainLayoutContext();
  const { onToggleStorageClassDetail } = useDetailDrawerContext((v) => ({
    onToggleStorageClassDetail: v.onToggleStorageClassDetail,
  }));
  const [search, setSearch] = useState("");
  const [selectedSCNames, setSelectedSCNames] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deleteStorageClasses, isPending: isBulkDeletePending } =
    useDeleteStorageClasses();

  const { data: raw = [], isLoading } = useGetStorageClasses(activeContext);

  const classes = useMemo(
    () =>
      raw
        .filter((sc) => !search || sc.Name.toLowerCase().includes(search.toLowerCase()))
        .toSorted((a, b) => a.Name.localeCompare(b.Name)),
    [raw, search]
  );

  const {
    visibleItems: visibleClasses,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(classes, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Storage Classes</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          description="A StorageClass describes the classes of storage available in a cluster and enables dynamic provisioning of PersistentVolumes."
          docsUrl="https://kubernetes.io/docs/concepts/storage/storage-classes"
        />
        <span className="text-xs text-muted-foreground">
          {classes.length} item{classes.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedSCNames.size}
            ariaLabel="Delete selected storage classes"
            tooltip="Delete selected Storage Classes"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Storage Classes..."
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
                  visibleClasses.length > 0 &&
                  visibleClasses.every((sc) => selectedSCNames.has(sc.Name))
                }
                indeterminate={
                  visibleClasses.some((sc) => selectedSCNames.has(sc.Name)) &&
                  !visibleClasses.every((sc) => selectedSCNames.has(sc.Name))
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedSCNames);
                    visibleClasses.forEach((sc) => newSelection.add(sc.Name));
                    setSelectedSCNames(newSelection);
                  } else {
                    const newSelection = new Set(selectedSCNames);
                    visibleClasses.forEach((sc) => newSelection.delete(sc.Name));
                    setSelectedSCNames(newSelection);
                  }
                }}
                aria-label="Select all visible storage classes"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Provisioner</TableHead>
            <TableHead>Reclaim Policy</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={5}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[45%]", "w-[40%]", "w-[35%]", "w-[30%]"]}
            />
          ) : visibleClasses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="px-0 py-0">
                <EmptyState
                  icon={<SaveIcon className="size-8" />}
                  title="No Storage Classes"
                  description="Storage Classes define how Persistent Volumes are provisioned"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleClasses.map((sc) => {
              const isSelected = selectedSCNames.has(sc.Name);
              return (
                <TableRow
                  key={sc.Name}
                  className={cn(isSelected && "bg-accent/30")}
                  onClick={() => onToggleStorageClassDetail(sc.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedSCNames);
                        if (isSelected) newSelection.delete(sc.Name);
                        else newSelection.add(sc.Name);
                        setSelectedSCNames(newSelection);
                      }}
                      aria-label={`Select storage class ${sc.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{sc.Name}</TableCell>
                  <TableCell className="text-xs">{sc.Provisioner}</TableCell>
                  <TableCell className="text-xs">{sc.ReclaimPolicy}</TableCell>
                  <TableCell className="text-xs">{sc.Default ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-xs">{sc.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <StorageClassTableCtaButtons name={sc.Name} />
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
          totalItems={classes.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedSCNames.size > 0 && (
        <StorageClassDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedSCNames)}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            deleteStorageClasses(
              { names: Array.from(selectedSCNames) },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedSCNames(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
