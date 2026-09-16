import {
  Button,
  FormModal,
  Input,
  NameSpaceSelectDropdown,
  PlusIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Trash2Icon,
} from "@galacius/design-system";
import { FC, useRef, useState } from "react";
import { useGetNamespaceNames } from "../../../base/namespaces/hooks/data-access/useGetNamespaceNames";
import { useCreateResourceQuota } from "../hooks/data-mutation/useCreateResourceQuota";

const QUOTA_TYPES = [
  // Compute
  "requests.cpu",
  "limits.cpu",
  "requests.memory",
  "limits.memory",
  // Storage
  "requests.storage",
  "requests.ephemeral-storage",
  "limits.ephemeral-storage",
  // Object count (legacy)
  "pods",
  "services",
  "services.nodeports",
  "services.loadbalancers",
  "replicationcontrollers",
  "resourcequotas",
  "secrets",
  "configmaps",
  "persistentvolumeclaims",
  // Object count (count/ prefix)
  "count/pods",
  "count/services",
  "count/secrets",
  "count/configmaps",
  "count/persistentvolumeclaims",
  "count/replicationcontrollers",
  "count/deployments.apps",
  "count/replicasets.apps",
  "count/statefulsets.apps",
  "count/jobs.batch",
  "count/cronjobs.batch",
];

interface ResourceQuotaCreationModalProps {
  open: boolean;
  onClose: () => void;
  activeNamespace: string;
  activeContext: string;
}

interface QuotaRow {
  id: number;
  quotaType: string;
  value: string;
}

export const ResourceQuotaCreationModal: FC<ResourceQuotaCreationModalProps> = ({
  open,
  onClose,
  activeNamespace,
  activeContext,
}) => {
  const nextRowIdRef = useRef(1);

  const [name, setName] = useState("");
  const [namespaceOverride, setNamespaceOverride] = useState<string | null>(null);

  const selectedNamespace = namespaceOverride ?? activeNamespace;

  const [quotaRows, setQuotaRows] = useState<QuotaRow[]>([{ id: 0, quotaType: "", value: "" }]);

  const { mutate, isPending } = useCreateResourceQuota();
  const { data: namespaces = [] } = useGetNamespaceNames(activeContext);

  const handleClose = () => {
    setName("");
    setNamespaceOverride(null);
    nextRowIdRef.current = 1;
    setQuotaRows([{ id: 0, quotaType: "", value: "" }]);
    onClose();
  };

  const handleAddRow = () => {
    const id = nextRowIdRef.current;
    nextRowIdRef.current += 1;
    setQuotaRows((prev) => [...prev, { id, quotaType: "", value: "" }]);
  };

  const handleDeleteRow = (id: number) => {
    setQuotaRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleUpdateRow = (id: number, quotaType?: string, value?: string) => {
    setQuotaRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, quotaType: quotaType ?? row.quotaType, value: value ?? row.value }
          : row
      )
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    const hard: Record<string, string> = {};
    for (const row of quotaRows) {
      if (row.quotaType && row.value) {
        hard[row.quotaType] = row.value;
      }
    }

    if (Object.keys(hard).length === 0) return;

    mutate(
      { namespace: selectedNamespace, name: name.trim(), hard },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  const selectedTypes = new Set(quotaRows.flatMap((r) => (r.quotaType ? [r.quotaType] : [])));
  const allTypesTaken = selectedTypes.size >= QUOTA_TYPES.length;

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title="Create Resource Quota"
      isLoading={isPending}
      submitDisabled={name.trim() === "" || !quotaRows.some((r) => r.quotaType && r.value)}
      submitLabel={isPending ? "Creating..." : "Create"}
      size="lg"
      onSubmit={handleCreate}
    >
      {/* Name input */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Name
        </span>
        <Input
          placeholder="Resource Quota name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
        />
      </div>

      {/* Namespace section */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Namespace
        </span>
        <NameSpaceSelectDropdown
          namespaces={namespaces}
          value={selectedNamespace}
          onChange={(val) => setNamespaceOverride(val)}
          disabled={isPending}
          placeholder="Select a namespace..."
        />
      </div>

      {/* Values section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Values
          </span>
          <Button
            type="button"
            size="icon-sm"
            className="shrink-0 rounded-full"
            aria-label="Add quota row"
            onClick={handleAddRow}
            disabled={isPending || allTypesTaken}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
        <div className="flex max-h-100 flex-col gap-2 overflow-y-auto">
          {quotaRows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <Select
                value={row.quotaType}
                onValueChange={(val) => handleUpdateRow(row.id, val ?? "")}
                disabled={isPending}
              >
                <SelectTrigger className="w-48 shrink-0">
                  <SelectValue placeholder="Select quota type" />
                </SelectTrigger>
                <SelectContent>
                  {QUOTA_TYPES.flatMap((type) =>
                    type === row.quotaType || !selectedTypes.has(type)
                      ? [
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>,
                        ]
                      : []
                  )}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                placeholder="Value"
                value={row.value}
                onChange={(e) => handleUpdateRow(row.id, undefined, e.target.value)}
                disabled={isPending}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Remove quota row"
                onClick={() => handleDeleteRow(row.id)}
                disabled={isPending || quotaRows.length === 1}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </FormModal>
  );
};
