import { FormModal, Input } from "@galacius/design-system";

import { FC, useState } from "react";
import { useCreateNamespace } from "../hooks/data-mutation/useCreateNamespace";

interface NamespaceCreationModalProps {
  open: boolean;
  onClose: () => void;
}

export const NamespaceCreationModal: FC<NamespaceCreationModalProps> = ({ open, onClose }) => {
  const [name, setName] = useState("");

  const { mutate, isPending } = useCreateNamespace();

  const handleClose = () => {
    setName("");
    onClose();
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    mutate(name.trim(), {
      onSuccess: () => {
        handleClose();
      },
    });
  };

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title="Create Namespace"
      isLoading={isPending}
      submitDisabled={name.trim() === ""}
      submitLabel={isPending ? "Creating..." : "Create"}
      size="sm"
      onSubmit={handleCreate}
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Name
        </span>
        <Input
          placeholder="Namespace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
        />
      </div>
    </FormModal>
  );
};
