import { ConfirmationModal } from "@galacius/design-system";
import { FC, useMemo } from "react";

interface NodeDeleteConfirmationModalProps {
  open: boolean;
  mode: "single" | "bulk";
  name?: string;
  items?: string[];
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const NodeDeleteConfirmationModal: FC<NodeDeleteConfirmationModalProps> = ({
  open,
  mode,
  name,
  items,
  isPending,
  onClose,
  onConfirm,
}) => {
  const { title, description } = useMemo(() => {
    if (mode === "single") {
      return {
        title: (
          <>
            Delete Node: <span className="font-mono font-normal text-muted-foreground">{name}</span>
          </>
        ),
        description: (
          <>
            This will permanently delete{" "}
            <span className="font-mono font-medium text-foreground">{name}</span> and evict all Pods
            running on it. This action cannot be undone.
          </>
        ),
      };
    }

    const count = items?.length ?? 0;

    return {
      title: `Delete ${count} Node${count === 1 ? "" : "s"}`,
      description: (
        <>
          This will permanently delete {count} node{count === 1 ? "" : "s"} and evict all Pods
          running on {count === 1 ? "it" : "them"}. This action cannot be undone.
        </>
      ),
    };
  }, [mode, name, items]);

  return (
    <ConfirmationModal
      open={open}
      title={title}
      description={description}
      confirmLabel="Delete"
      confirmVariant="destructive"
      isPending={isPending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
};
