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
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonLoader,
  WebhookIcon,
  cn,
} from "@galacius/design-system";
import { FC, useState } from "react";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { ValidatingWebhookConfigDeleteConfirmationModal } from "./components/ValidatingWebhookConfigDeleteConfirmationModal";
import { useGetValidatingWebhookConfigs } from "./hooks/data-access/useGetValidatingWebhookConfigs";
import { useDeleteValidatingWebhookConfig } from "./hooks/data-mutation/useDeleteValidatingWebhookConfig";
import { useDeleteValidatingWebhookConfigs } from "./hooks/data-mutation/useDeleteValidatingWebhookConfigs";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface ValidatingWebhookConfigTableCtaButtonsProps {
  name: string;
}

const ValidatingWebhookConfigTableCtaButtons: FC<ValidatingWebhookConfigTableCtaButtonsProps> = ({
  name,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteValidatingWebhookConfig, isPending: isDeletePending } =
    useDeleteValidatingWebhookConfig();

  const handleDeleteConfirm = () => {
    deleteValidatingWebhookConfig({ name }, { onSuccess: () => setShowDeleteModal(false) });
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
        <DropdownMenuContent align="end" className="w-fit">
          <ResourceModificationButton
            onClick={() => openTab("modification", { kind: "ValidatingWebhookConfig", name })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <ValidatingWebhookConfigDeleteConfirmationModal
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

export const ValidatingWebhookConfigsView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const [search, setSearch] = useState("");
  const [selectedVWCNames, setSelectedVWCNames] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { activeContext } = useMainLayoutContext();
  const { onToggleValidatingWebhookConfigDetail } = useDetailDrawerContext((v) => ({
    onToggleValidatingWebhookConfigDetail: v.onToggleValidatingWebhookConfigDetail,
  }));

  const { mutate: deleteValidatingWebhookConfigs, isPending: isBulkDeletePending } =
    useDeleteValidatingWebhookConfigs();

  const { data: raw = [], isLoading } = useGetValidatingWebhookConfigs(activeContext);

  const validatingWebhookConfigs = raw
    .filter((vwc) => !search || vwc.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const {
    visibleItems: visibleVWCs,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(validatingWebhookConfigs, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Validating Webhook Configs</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-lg" }}
          description="A ValidatingWebhookConfiguration registers admission webhooks that can accept or reject requests to the Kubernetes API before they're persisted."
          docsUrl="https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers"
        />
        <span className="text-xs text-muted-foreground">
          {validatingWebhookConfigs.length} item{validatingWebhookConfigs.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedVWCNames.size}
            ariaLabel="Delete selected validating webhook configs"
            tooltip="Delete selected ValidatingWebhookConfigs"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Validating Webhook Configs..."
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
                  visibleVWCs.length > 0 &&
                  visibleVWCs.every((vwc) => selectedVWCNames.has(vwc.Name))
                }
                indeterminate={
                  visibleVWCs.some((vwc) => selectedVWCNames.has(vwc.Name)) &&
                  !visibleVWCs.every((vwc) => selectedVWCNames.has(vwc.Name))
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedVWCNames);
                    visibleVWCs.forEach((vwc) => newSelection.add(vwc.Name));
                    setSelectedVWCNames(newSelection);
                  } else {
                    const newSelection = new Set(selectedVWCNames);
                    visibleVWCs.forEach((vwc) => newSelection.delete(vwc.Name));
                    setSelectedVWCNames(newSelection);
                  }
                }}
                aria-label="Select all visible validating webhook configs"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Webhooks</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={3}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[45%]", "w-[30%]"]}
            />
          ) : visibleVWCs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="px-0 py-0">
                <EmptyState
                  icon={<WebhookIcon className="size-8" />}
                  title="No Validating Webhook Configurations"
                  description="Validating webhook configurations control admission review for the cluster"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleVWCs.map((vwc) => {
              const isSelected = selectedVWCNames.has(vwc.Name);
              return (
                <TableRow
                  key={vwc.Name}
                  className={cn(isSelected && "bg-accent/30", "cursor-pointer")}
                  onClick={() => onToggleValidatingWebhookConfigDetail(vwc.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedVWCNames);
                        if (isSelected) newSelection.delete(vwc.Name);
                        else newSelection.add(vwc.Name);
                        setSelectedVWCNames(newSelection);
                      }}
                      aria-label={`Select validating webhook config ${vwc.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{vwc.Name}</TableCell>
                  <TableCell className="text-xs">{vwc.Webhooks}</TableCell>
                  <TableCell className="text-xs">{vwc.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ValidatingWebhookConfigTableCtaButtons name={vwc.Name} />
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
          totalItems={validatingWebhookConfigs.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedVWCNames.size > 0 && (
        <ValidatingWebhookConfigDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedVWCNames)}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const names = Array.from(selectedVWCNames);
            deleteValidatingWebhookConfigs(
              { names },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedVWCNames(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
