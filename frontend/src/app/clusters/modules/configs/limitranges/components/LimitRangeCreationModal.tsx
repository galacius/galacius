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
import { useCreateLimitRange } from "../hooks/data-mutation/useCreateLimitRange";

const LIMIT_TYPES = ["ContainerIcon", "Pod", "PersistentVolumeClaim"];
const RESOURCES = ["cpu", "memory", "ephemeral-storage"];
const VALUE_TYPES = ["Min", "Max", "Default", "DefaultRequest"];

const isValidRow = (row: LimitRow) =>
  row.limitType.trim() !== "" &&
  row.resource.trim() !== "" &&
  row.valueType.trim() !== "" &&
  row.value.trim() !== "";

interface LimitRangeCreationModalProps {
  open: boolean;
  onClose: () => void;
  activeNamespace: string;
  activeContext: string;
}

interface LimitRow {
  id: number;
  limitType: string;
  resource: string;
  valueType: string;
  value: string;
}

export const LimitRangeCreationModal: FC<LimitRangeCreationModalProps> = ({
  open,
  onClose,
  activeNamespace,
  activeContext,
}) => {
  const nextRowIdRef = useRef(1);

  const [name, setName] = useState("");
  const [namespaceOverride, setNamespaceOverride] = useState<string | null>(null);

  const selectedNamespace = namespaceOverride ?? activeNamespace;

  const [limitRows, setLimitRows] = useState<LimitRow[]>([
    { id: 0, limitType: "", resource: "", valueType: "", value: "" },
  ]);

  const { mutate, isPending } = useCreateLimitRange();
  const { data: namespaces = [] } = useGetNamespaceNames(activeContext);

  const handleClose = () => {
    setName("");
    setNamespaceOverride(null);
    nextRowIdRef.current = 1;
    setLimitRows([{ id: 0, limitType: "", resource: "", valueType: "", value: "" }]);
    onClose();
  };

  const handleAddRow = () => {
    const id = nextRowIdRef.current;
    nextRowIdRef.current += 1;
    setLimitRows((prev) => [
      ...prev,
      { id, limitType: "", resource: "", valueType: "", value: "" },
    ]);
  };

  const handleDeleteRow = (id: number) => {
    setLimitRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleUpdateRow = (
    id: number,
    limitType?: string,
    resource?: string,
    valueType?: string,
    value?: string
  ) => {
    setLimitRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          limitType: limitType ?? row.limitType,
          resource: resource ?? row.resource,
          valueType: valueType ?? row.valueType,
          value: value ?? row.value,
        };
      })
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    const limits: Record<string, Record<string, string>> = {};
    for (const row of limitRows) {
      if (row.limitType.trim() && row.resource.trim() && row.valueType.trim() && row.value.trim()) {
        if (!limits[row.limitType]) {
          limits[row.limitType] = {};
        }
        limits[row.limitType][`${row.resource}/${row.valueType}`] = row.value;
      }
    }

    if (Object.keys(limits).length === 0) return;

    mutate(
      { namespace: selectedNamespace, name: name.trim(), limits },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title="Create Limit Range"
      isLoading={isPending}
      submitDisabled={name.trim() === "" || !limitRows.some(isValidRow)}
      submitLabel={isPending ? "Creating..." : "Create"}
      size="2xl"
      onSubmit={handleCreate}
    >
      {/* Name input */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Name
        </span>
        <Input
          placeholder="Limit Range name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          className="w-72"
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

      {/* Limits section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Limits
          </span>
          <Button
            type="button"
            size="icon-sm"
            aria-label="Add limit row"
            onClick={handleAddRow}
            disabled={isPending}
            className="rounded-full"
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
        <div className="flex max-h-100 flex-col gap-2 overflow-y-auto">
          {limitRows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <Select
                value={row.limitType}
                onValueChange={(val) => handleUpdateRow(row.id, val ?? "")}
                disabled={isPending}
              >
                <SelectTrigger className="w-44 shrink-0">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={row.resource}
                onValueChange={(val) => handleUpdateRow(row.id, undefined, val ?? "")}
                disabled={isPending}
              >
                <SelectTrigger className="w-42 shrink-0">
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCES.map((res) => (
                    <SelectItem key={res} value={res}>
                      {res}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={row.valueType}
                onValueChange={(val) => handleUpdateRow(row.id, undefined, undefined, val ?? "")}
                disabled={isPending}
              >
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue placeholder="Value Type" />
                </SelectTrigger>
                <SelectContent>
                  {VALUE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="e.g., 100m, 512Mi"
                value={row.value}
                onChange={(e) =>
                  handleUpdateRow(row.id, undefined, undefined, undefined, e.target.value)
                }
                disabled={isPending}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove limit row"
                onClick={() => handleDeleteRow(row.id)}
                disabled={isPending || limitRows.length === 1}
                className="shrink-0 text-muted-foreground hover:text-destructive"
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
