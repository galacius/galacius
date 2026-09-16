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
  SearchInput,
  ShieldIcon,
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
import { RoleDeleteConfirmationModal } from "./components/RoleDeleteConfirmationModal";
import { useGetRoles } from "./hooks/data-access/useGetRoles";
import { useDeleteRole } from "./hooks/data-mutation/useDeleteRole";
import { useDeleteRoles } from "./hooks/data-mutation/useDeleteRoles";

const RoleTableCtaButtons: FC<{ namespace: string; name: string }> = ({ namespace, name }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteRole, isPending: isDeletePending } = useDeleteRole();

  const handleDeleteConfirm = () => {
    deleteRole({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
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
              openTab("modification", { kind: "Role", name: name, namespace: namespace })
            }
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <RoleDeleteConfirmationModal
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

export const RolesView: FC = () => {
  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleRoleDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleRoleDetail: v.onToggleRoleDetail,
  }));

  const openBrowserURL = useOpenBrowserURL();

  const [search, setSearch] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deleteRoles, isPending: isBulkDeletePending } = useDeleteRoles();

  const { data: raw = [], isLoading } = useGetRoles({ context: activeContext, namespaces });

  const roles = useMemo(
    () =>
      raw
        .filter((r) => !search || r.Name.toLowerCase().includes(search.toLowerCase()))
        .toSorted((a, b) => a.Name.localeCompare(b.Name)),
    [raw, search]
  );

  const {
    visibleItems: visibleRoles,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(roles, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Roles</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          description="A Role defines a set of permissions within a single namespace, specifying which actions can be performed on which resources."
          docsUrl="https://kubernetes.io/docs/reference/access-authn-authz/rbac"
        />
        <span className="text-xs text-muted-foreground">
          {roles.length} item{roles.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedRoleIds.size}
            ariaLabel="Delete selected roles"
            tooltip="Delete selected Roles"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Roles..."
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
                  visibleRoles.length > 0 &&
                  visibleRoles.every((r) => selectedRoleIds.has(`${r.Namespace}/${r.Name}`))
                }
                indeterminate={
                  visibleRoles.some((r) => selectedRoleIds.has(`${r.Namespace}/${r.Name}`)) &&
                  !visibleRoles.every((r) => selectedRoleIds.has(`${r.Namespace}/${r.Name}`))
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedRoleIds);
                    visibleRoles.forEach((r) => newSelection.add(`${r.Namespace}/${r.Name}`));
                    setSelectedRoleIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedRoleIds);
                    visibleRoles.forEach((r) => newSelection.delete(`${r.Namespace}/${r.Name}`));
                    setSelectedRoleIds(newSelection);
                  }
                }}
                aria-label="Select all visible roles"
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
          ) : visibleRoles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 5 : 4} className="px-0 py-0">
                <EmptyState
                  icon={<ShieldIcon className="size-8" />}
                  title="No Roles"
                  description="Create a Role to define namespace permissions"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleRoles.map((r) => {
              const rId = `${r.Namespace}/${r.Name}`;
              const isSelected = selectedRoleIds.has(rId);
              return (
                <TableRow
                  key={rId}
                  className={cn(isSelected && "bg-accent/30", "cursor-pointer")}
                  onClick={() => onToggleRoleDetail(r.Namespace, r.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedRoleIds);
                        if (isSelected) newSelection.delete(rId);
                        else newSelection.add(rId);
                        setSelectedRoleIds(newSelection);
                      }}
                      aria-label={`Select role ${r.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(r.Namespace);
                        }}
                      >
                        {r.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{r.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <RoleTableCtaButtons namespace={r.Namespace} name={r.Name} />
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
          totalItems={roles.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedRoleIds.size > 0 && (
        <RoleDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedRoleIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedRoleIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteRoles(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedRoleIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
