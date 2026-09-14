import {
  Checkbox,
  CopyIcon,
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
  ResourceScaleButton,
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
import { ReplicaSetDeleteConfirmationModal } from "./components/ReplicaSetDeleteConfirmationModal";
import { ReplicaSetHealthBadge } from "./components/ReplicaSetHealthBadge";
import { ReplicaSetScaleModal } from "./components/ReplicaSetScaleModal";
import { useGetReplicaSets } from "./hooks/data-access/useGetReplicaSets";
import { useDeleteReplicaSet } from "./hooks/data-mutation/useDeleteReplicaSet";
import { useDeleteReplicaSets } from "./hooks/data-mutation/useDeleteReplicaSets";
import { useScaleReplicaSet } from "./hooks/data-mutation/useScaleReplicaSet";

interface ReplicaSetTableCtaButtonsProps {
  namespace: string;
  name: string;
  currentReplicas: number;
  ownerKind: string;
  ownerName: string;
}

const ReplicaSetTableCtaButtons: FC<ReplicaSetTableCtaButtonsProps> = ({
  namespace,
  name,
  currentReplicas,
  ownerKind,
  ownerName,
}) => {
  const { mutate: scaleMutate, isPending: isScalePending } = useScaleReplicaSet();
  const { mutate: deleteMutate, isPending: isDeletePending } = useDeleteReplicaSet();
  const { openTab } = useUnifiedTray();
  const [scaleOpen, setScaleOpen] = useState(false);
  const [scaleKey, setScaleKey] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isOwned = ownerKind !== "";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Actions"
          className="flex size-6 cursor-pointer items-center justify-center rounded-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
          disabled={isScalePending}
        >
          <MoreVerticalIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ResourceScaleButton
            isNotAllowed={isOwned}
            notAllowedReason={`Owned by ${ownerKind} ${ownerName} — scale the parent resource instead.`}
            onClick={() => {
              setScaleKey((k) => k + 1);
              setScaleOpen(true);
            }}
          />
          <ResourceModificationButton
            onClick={() => openTab("modification", { kind: "ReplicaSet", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <ReplicaSetScaleModal
        key={scaleKey}
        open={scaleOpen}
        name={name}
        currentReplicas={currentReplicas}
        isPending={isScalePending}
        onClose={() => setScaleOpen(false)}
        onScale={(replicas) => {
          scaleMutate({ namespace, name, replicas });
          setScaleOpen(false);
        }}
      />

      <ReplicaSetDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        namespace={namespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          deleteMutate({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
        }}
      />
    </>
  );
};

export const ReplicaSetsView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const [search, setSearch] = useState("");
  const [selectedReplicaSetIds, setSelectedReplicaSetIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleReplicaSetDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleReplicaSetDetail: v.onToggleReplicaSetDetail,
  }));

  const { mutate: deleteReplicaSets, isPending: isBulkDeletePending } = useDeleteReplicaSets();

  const { data: raw = [], isLoading } = useGetReplicaSets({ context: activeContext, namespaces });

  const replicasets = useMemo(
    () =>
      raw
        .filter((rs) => !search || rs.Name.toLowerCase().includes(search.toLowerCase()))
        .toSorted((a, b) => a.Name.localeCompare(b.Name)),
    [raw, search]
  );

  const {
    visibleItems: visibleReplicaSets,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(replicasets, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Replica Sets</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-lg" }}
          description="A ReplicaSet ensures that a specified number of identical Pod replicas are running at any given time."
          docsUrl="https://kubernetes.io/docs/concepts/workloads/controllers/replicaset"
        />
        <span className="text-xs text-muted-foreground">
          {replicasets.length} item{replicasets.length == 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedReplicaSetIds.size}
            ariaLabel="Delete selected replicasets"
            tooltip="Delete selected replicasets"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Replica Sets..."
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
                  visibleReplicaSets.length > 0 &&
                  visibleReplicaSets.every((rs) =>
                    selectedReplicaSetIds.has(`${rs.Namespace}/${rs.Name}`)
                  )
                }
                indeterminate={
                  visibleReplicaSets.some((rs) =>
                    selectedReplicaSetIds.has(`${rs.Namespace}/${rs.Name}`)
                  ) &&
                  !visibleReplicaSets.every((rs) =>
                    selectedReplicaSetIds.has(`${rs.Namespace}/${rs.Name}`)
                  )
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedReplicaSetIds);
                    visibleReplicaSets.forEach((rs) =>
                      newSelection.add(`${rs.Namespace}/${rs.Name}`)
                    );
                    setSelectedReplicaSetIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedReplicaSetIds);
                    visibleReplicaSets.forEach((rs) =>
                      newSelection.delete(`${rs.Namespace}/${rs.Name}`)
                    );
                    setSelectedReplicaSetIds(newSelection);
                  }
                }}
                aria-label="Select all visible replicasets"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Desired</TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Ready</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 7 : 6}
              includeCheckbox={true}
              columnWidths={[
                "w-[65%]",
                "w-[55%]",
                "w-[30%]",
                "w-[30%]",
                "w-[30%]",
                "w-[30%]",
                "w-[30%]",
              ]}
            />
          ) : visibleReplicaSets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 9 : 8} className="px-0 py-0">
                <EmptyState
                  icon={<CopyIcon className="size-8" />}
                  title="No ReplicaSets"
                  description="ReplicaSets are created automatically by Deployments"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleReplicaSets.map((rs) => {
              const rsId = `${rs.Namespace}/${rs.Name}`;
              const isSelected = selectedReplicaSetIds.has(rsId);
              return (
                <TableRow
                  key={rsId}
                  className={cn(isSelected && "bg-accent/30")}
                  onClick={() => onToggleReplicaSetDetail(rs.Namespace, rs.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedReplicaSetIds);
                        if (isSelected) newSelection.delete(rsId);
                        else newSelection.add(rsId);
                        setSelectedReplicaSetIds(newSelection);
                      }}
                      aria-label={`Select replicaset ${rs.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{rs.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(rs.Namespace);
                        }}
                      >
                        {rs.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{rs.Desired}</TableCell>
                  <TableCell className="text-xs">{rs.Current}</TableCell>
                  <TableCell className="text-xs">{rs.Ready}</TableCell>
                  <TableCell className="text-xs">
                    {rs.HealthStatus ? (
                      <ReplicaSetHealthBadge status={rs.HealthStatus} message={rs.HealthMessage} />
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{rs.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ReplicaSetTableCtaButtons
                      namespace={rs.Namespace}
                      name={rs.Name}
                      currentReplicas={rs.Current}
                      ownerKind={rs.OwnerKind}
                      ownerName={rs.OwnerName}
                    />
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
          totalItems={replicasets.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedReplicaSetIds.size > 0 && (
        <ReplicaSetDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedReplicaSetIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedReplicaSetIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteReplicaSets(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedReplicaSetIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
