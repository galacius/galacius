import {
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  LockIcon,
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
  TruncatedText,
  cn,
} from "@galacius/design-system";
import { FC, useState } from "react";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { SecretDeleteConfirmationModal } from "./components/SecretDeleteConfirmationModal";
import { useGetSecrets } from "./hooks/data-access/useGetSecrets";
import { useDeleteSecret } from "./hooks/data-mutation/useDeleteSecret";
import { useDeleteSecrets } from "./hooks/data-mutation/useDeleteSecrets";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface SecretTableCtaButtonsProps {
  name: string;
  namespace: string;
}

const SecretTableCtaButtons: FC<SecretTableCtaButtonsProps> = ({ namespace, name }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteSecret, isPending: isDeletePending } = useDeleteSecret();

  const handleDeleteConfirm = () => {
    deleteSecret({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
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
            onClick={() => openTab("modification", { kind: "Secret", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <SecretDeleteConfirmationModal
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

export const SecretsView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleSecretDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleSecretDetail: v.onToggleSecretDetail,
  }));

  const [search, setSearch] = useState("");
  const [selectedSecretIds, setSelectedSecretIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deleteSecrets, isPending: isBulkDeletePending } = useDeleteSecrets();

  const { data: raw = [], isLoading } = useGetSecrets({ context: activeContext, namespaces });

  const secrets = raw
    .filter((s) => !search || s.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const {
    visibleItems: visibleSecrets,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(secrets, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Secrets</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          description="A Secret stores sensitive data, such as passwords, tokens, or keys, keeping it separate from application code."
          docsUrl="https://kubernetes.io/docs/concepts/configuration/secret"
        />
        <span className="text-xs text-muted-foreground">
          {secrets.length} item{secrets.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedSecretIds.size}
            ariaLabel="Delete selected secrets"
            tooltip="Delete selected Secrets"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Secrets..."
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
                  visibleSecrets.length > 0 &&
                  visibleSecrets.every((s) => selectedSecretIds.has(`${s.Namespace}/${s.Name}`))
                }
                indeterminate={
                  visibleSecrets.some((s) => selectedSecretIds.has(`${s.Namespace}/${s.Name}`)) &&
                  !visibleSecrets.every((s) => selectedSecretIds.has(`${s.Namespace}/${s.Name}`))
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedSecretIds);
                    visibleSecrets.forEach((s) => newSelection.add(`${s.Namespace}/${s.Name}`));
                    setSelectedSecretIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedSecretIds);
                    visibleSecrets.forEach((s) => newSelection.delete(`${s.Namespace}/${s.Name}`));
                    setSelectedSecretIds(newSelection);
                  }
                }}
                aria-label="Select all visible secrets"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Labels</TableHead>
            <TableHead>Keys</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 6 : 5}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[55%]", "w-[35%]", "w-[35%]", "w-[30%]", "w-[30%]"]}
            />
          ) : visibleSecrets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 8 : 7} className="px-0 py-0">
                <EmptyState
                  icon={<LockIcon className="size-8" />}
                  title="No Secrets"
                  description="Create a secret to store sensitive data"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleSecrets.map((s) => {
              const sId = `${s.Namespace}/${s.Name}`;
              const isSelected = selectedSecretIds.has(sId);
              return (
                <TableRow
                  key={sId}
                  className={cn(isSelected && "bg-accent/30", "cursor-pointer")}
                  onClick={() => onToggleSecretDetail(s.Namespace, s.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedSecretIds);
                        if (isSelected) newSelection.delete(sId);
                        else newSelection.add(sId);
                        setSelectedSecretIds(newSelection);
                      }}
                      aria-label={`Select secret ${s.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(s.Namespace);
                        }}
                      >
                        {s.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="max-w-36 text-muted-foreground">
                    <TruncatedText text={s.Labels?.length ? s.Labels.join(", ") : "—"} />
                  </TableCell>
                  <TableCell className="max-w-36 text-muted-foreground">
                    <TruncatedText text={s.Keys?.join(", ") || "—"} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.Type}</TableCell>
                  <TableCell className="text-xs">{s.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <SecretTableCtaButtons name={s.Name} namespace={s.Namespace} />
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
          totalItems={secrets.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedSecretIds.size > 0 && (
        <SecretDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedSecretIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedSecretIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteSecrets(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedSecretIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
