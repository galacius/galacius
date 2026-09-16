import {
  AnnotationBadge,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  LayersIcon,
  MoreVerticalIcon,
  ResourceBulkDeletionButton,
  ResourceDeletionButton,
  ResourceExplanationTooltip,
  ResourceLink,
  ResourceModificationButton,
  ResourceRestartButton,
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
import { useGetDaemonSets } from "./hooks/data-access/useGetDaemonSets";
import { useDeleteDaemonSet } from "./hooks/data-mutation/useDeleteDaemonSet";
import { useDeleteDaemonSets } from "./hooks/data-mutation/useDeleteDaemonSets";
import { useRestartDaemonSet } from "./hooks/data-mutation/useRestartDaemonSet";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { DaemonSetDeleteConfirmationModal } from "./components/DaemonSetDeleteConfirmationModal";
import { DaemonSetRestartConfirmationModal } from "./components/DaemonSetRestartConfirmationModal";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface DaemonSetTableCtaButtonsProps {
  namespace: string;
  name: string;
}

const DaemonSetTableCtaButtons: FC<DaemonSetTableCtaButtonsProps> = ({ namespace, name }) => {
  const { openTab } = useUnifiedTray();

  const { mutate, isPending } = useRestartDaemonSet();
  const { mutate: deleteMutate, isPending: isDeletePending } = useDeleteDaemonSet();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Actions"
          className="flex size-6 cursor-pointer items-center justify-center rounded-sm hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
          disabled={isPending || isDeletePending}
        >
          <MoreVerticalIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ResourceRestartButton onClick={() => setConfirmOpen(true)} />
          <ResourceModificationButton
            onClick={() => openTab("modification", { kind: "DaemonSet", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <DaemonSetRestartConfirmationModal
        open={confirmOpen}
        name={name}
        isPending={isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          mutate({ namespace, name });
          setConfirmOpen(false);
        }}
      />

      <DaemonSetDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        namespace={namespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() =>
          deleteMutate({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) })
        }
      />
    </>
  );
};

export const DaemonSetsView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleDaemonSetDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleDaemonSetDetail: v.onToggleDaemonSetDetail,
  }));
  const [search, setSearch] = useState("");
  const [selectedDaemonSetIds, setSelectedDaemonSetIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deleteDaemonSets, isPending: isBulkDeletePending } = useDeleteDaemonSets();

  const { data: raw = [], isLoading } = useGetDaemonSets({ context: activeContext, namespaces });

  const daemonsets = useMemo(
    () =>
      raw
        .filter((ds) => !search || ds.Name.toLowerCase().includes(search.toLowerCase()))
        .toSorted((a, b) => a.Name.localeCompare(b.Name)),
    [raw, search]
  );

  const {
    visibleItems: visibleDaemonSets,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(daemonsets, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Daemon Sets</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-lg" }}
          description="A DaemonSet ensures that a copy of a Pod runs on all, or a subset of, Nodes in the cluster."
          docsUrl="https://kubernetes.io/docs/concepts/workloads/controllers/daemonset"
        />
        <span className="text-xs text-muted-foreground">
          {daemonsets.length} item{daemonsets.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedDaemonSetIds.size}
            ariaLabel="Delete selected daemonsets"
            tooltip="Delete selected daemonsets"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Daemon Sets..."
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
                  visibleDaemonSets.length > 0 &&
                  visibleDaemonSets.every((ds) =>
                    selectedDaemonSetIds.has(`${ds.Namespace}/${ds.Name}`)
                  )
                }
                indeterminate={
                  visibleDaemonSets.some((ds) =>
                    selectedDaemonSetIds.has(`${ds.Namespace}/${ds.Name}`)
                  ) &&
                  !visibleDaemonSets.every((ds) =>
                    selectedDaemonSetIds.has(`${ds.Namespace}/${ds.Name}`)
                  )
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedDaemonSetIds);
                    visibleDaemonSets.forEach((ds) =>
                      newSelection.add(`${ds.Namespace}/${ds.Name}`)
                    );
                    setSelectedDaemonSetIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedDaemonSetIds);
                    visibleDaemonSets.forEach((ds) =>
                      newSelection.delete(`${ds.Namespace}/${ds.Name}`)
                    );
                    setSelectedDaemonSetIds(newSelection);
                  }
                }}
                aria-label="Select all visible daemonsets"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Pods</TableHead>
            <TableHead>Node Selector</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 5 : 4}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[55%]", "w-[40%]", "w-[45%]", "w-[30%]"]}
            />
          ) : visibleDaemonSets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 7 : 6} className="px-0 py-0">
                <EmptyState
                  icon={<LayersIcon className="size-8" />}
                  title="No DaemonSets"
                  description="Create a DaemonSet to run a pod on every node"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleDaemonSets.map((ds) => {
              const dsId = `${ds.Namespace}/${ds.Name}`;
              const isSelected = selectedDaemonSetIds.has(dsId);
              return (
                <TableRow
                  key={dsId}
                  className={cn(isSelected && "bg-accent/30")}
                  onClick={() => onToggleDaemonSetDetail(ds.Namespace, ds.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedDaemonSetIds);
                        if (isSelected) newSelection.delete(dsId);
                        else newSelection.add(dsId);
                        setSelectedDaemonSetIds(newSelection);
                      }}
                      aria-label={`Select daemonset ${ds.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{ds.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(ds.Namespace);
                        }}
                      >
                        {ds.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{ds.Pods}</TableCell>
                  <TableCell>
                    {Object.keys(ds.NodeSelector ?? {}).length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(ds.NodeSelector).map(([k, v]) => (
                          <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{ds.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DaemonSetTableCtaButtons namespace={ds.Namespace} name={ds.Name} />
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
          totalItems={daemonsets.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedDaemonSetIds.size > 0 && (
        <DaemonSetDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedDaemonSetIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedDaemonSetIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteDaemonSets(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedDaemonSetIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
