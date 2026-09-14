import {
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  MoreVerticalIcon,
  PackageIcon,
  ResourceBulkDeletionButton,
  ResourceDeletionButton,
  ResourceExplanationTooltip,
  ResourceLink,
  ResourceModificationButton,
  ResourceRestartButton,
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
import { useGetDeployments } from "./hooks/data-access/useGetDeployments";
import { useDeleteDeployment } from "./hooks/data-mutation/useDeleteDeployment";
import { useDeleteDeployments } from "./hooks/data-mutation/useDeleteDeployments";
import { useRestartDeployment } from "./hooks/data-mutation/useRestartDeployment";
import { useScaleDeployment } from "./hooks/data-mutation/useScaleDeployment";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { DeploymentConditionBadge } from "./components/DeploymentConditionBadge";
import { DeploymentDeleteConfirmationModal } from "./components/DeploymentDeleteConfirmationModal";
import { DeploymentRestartConfirmationModal } from "./components/DeploymentRestartConfirmationModal";
import { DeploymentScaleModal } from "./components/DeploymentScaleModal";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface DeploymentTableCtaButtonsProps {
  namespace: string;
  name: string;
  currentReplicas: number;
}

const DeploymentTableCtaButtons: FC<DeploymentTableCtaButtonsProps> = ({
  namespace,
  name,
  currentReplicas,
}) => {
  const { openTab } = useUnifiedTray();

  const { mutate, isPending } = useRestartDeployment();
  const { mutate: scaleMutate, isPending: isScalePending } = useScaleDeployment();
  const { mutate: deleteMutate, isPending: isDeletePending } = useDeleteDeployment();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [scaleKey, setScaleKey] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Actions"
          className="flex size-6 cursor-pointer items-center justify-center rounded-sm hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
          disabled={isPending || isScalePending || isDeletePending}
        >
          <MoreVerticalIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ResourceScaleButton
            onClick={() => {
              setScaleKey((k) => k + 1);
              setScaleOpen(true);
            }}
          />
          <ResourceRestartButton onClick={() => setConfirmOpen(true)} />
          <ResourceModificationButton
            onClick={() => openTab("modification", { kind: "Deployment", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <DeploymentScaleModal
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

      <DeploymentRestartConfirmationModal
        open={confirmOpen}
        name={name}
        isPending={isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          mutate({ namespace, name });
          setConfirmOpen(false);
        }}
      />

      <DeploymentDeleteConfirmationModal
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

export const DeploymentsView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleDeploymentDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleDeploymentDetail: v.onToggleDeploymentDetail,
  }));

  const [search, setSearch] = useState("");

  const [selectedDeploymentIds, setSelectedDeploymentIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deleteDeployments, isPending: isBulkDeletePending } = useDeleteDeployments();

  const { data: raw = [], isLoading } = useGetDeployments({ context: activeContext, namespaces });

  const deployments = useMemo(
    () =>
      raw
        .filter((dep) => !search || dep.Name.toLowerCase().includes(search.toLowerCase()))
        .toSorted((a, b) => a.Name.localeCompare(b.Name)),
    [raw, search]
  );

  const {
    visibleItems: visibleDeployments,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(deployments, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Deployments</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-lg" }}
          description="A Deployment manages a replicated set of Pods, providing declarative updates, rollbacks, and scaling for stateless applications."
          docsUrl="https://kubernetes.io/docs/concepts/workloads/controllers/deployment"
        />
        <span className="text-xs text-muted-foreground">
          {deployments.length} item{deployments.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedDeploymentIds.size}
            ariaLabel="Delete selected deployments"
            tooltip="Delete selected deployments"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Deployments..."
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
                  visibleDeployments.length > 0 &&
                  visibleDeployments.every((d) =>
                    selectedDeploymentIds.has(`${d.Namespace}/${d.Name}`)
                  )
                }
                indeterminate={
                  visibleDeployments.some((d) =>
                    selectedDeploymentIds.has(`${d.Namespace}/${d.Name}`)
                  ) &&
                  !visibleDeployments.every((d) =>
                    selectedDeploymentIds.has(`${d.Namespace}/${d.Name}`)
                  )
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedDeploymentIds);
                    visibleDeployments.forEach((d) => newSelection.add(`${d.Namespace}/${d.Name}`));
                    setSelectedDeploymentIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedDeploymentIds);
                    visibleDeployments.forEach((d) =>
                      newSelection.delete(`${d.Namespace}/${d.Name}`)
                    );
                    setSelectedDeploymentIds(newSelection);
                  }
                }}
                aria-label="Select all visible deployments"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Pods</TableHead>
            <TableHead>Replicas</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Conditions</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 6 : 5}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[55%]", "w-[35%]", "w-[40%]", "w-[30%]", "w-[45%]"]}
            />
          ) : visibleDeployments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 8 : 7} className="px-0 py-0">
                <EmptyState
                  icon={<PackageIcon className="size-8" />}
                  title="No Deployments"
                  description="Create a deployment to get started"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleDeployments.map((dep) => {
              const depId = `${dep.Namespace}/${dep.Name}`;
              const isSelected = selectedDeploymentIds.has(depId);
              return (
                <TableRow
                  key={depId}
                  className={cn(isSelected && "bg-accent/30")}
                  onClick={() => onToggleDeploymentDetail(dep.Namespace, dep.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedDeploymentIds);
                        if (isSelected) newSelection.delete(depId);
                        else newSelection.add(depId);
                        setSelectedDeploymentIds(newSelection);
                      }}
                      aria-label={`Select deployment ${dep.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{dep.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(dep.Namespace);
                        }}
                      >
                        {dep.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{dep.Pods}</TableCell>
                  <TableCell>{dep.Replicas}</TableCell>
                  <TableCell>{dep.Age}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(dep.Conditions ?? []).map((c) => (
                        <DeploymentConditionBadge key={c.Type} condition={c} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DeploymentTableCtaButtons
                      namespace={dep.Namespace}
                      name={dep.Name}
                      currentReplicas={dep.Replicas}
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
          totalItems={deployments.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedDeploymentIds.size > 0 && (
        <DeploymentDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedDeploymentIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedDeploymentIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteDeployments(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedDeploymentIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
