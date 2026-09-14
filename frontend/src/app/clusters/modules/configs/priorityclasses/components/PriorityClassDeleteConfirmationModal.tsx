import { ConfirmationModal } from "@galacius/design-system";
import { FC, useMemo } from "react";

interface PriorityClassDeleteConfirmationModalProps {
  open: boolean;
  mode: "single" | "bulk";
  name?: string;
  items?: Array<{ name: string }>;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const PriorityClassDeleteConfirmationModal: FC<
  PriorityClassDeleteConfirmationModalProps
> = ({ open, mode, name, items, isPending, onClose, onConfirm }) => {
  const { title, description } = useMemo(() => {
    if (mode === "single") {
      return {
        title: (
          <>
            Delete Priority Class:{" "}
            <span className="font-mono font-normal text-muted-foreground">{name}</span>
          </>
        ),
        description: (
          <>
            This will permanently delete{" "}
            <span className="font-mono font-medium text-foreground">{name}</span>. Pods using this
            Priority Class will retain their priority but cannot be created. This action cannot be
            undone.
          </>
        ),
      };
    }

    const count = items?.length ?? 0;

    return {
      title: `Delete ${count} Priority Class${count === 1 ? "" : "es"}`,
      description: (
        <>
          This will permanently delete {count} Priority Class{count === 1 ? "" : "es"}. Pods using
          these Priority Classes will retain their priority but cannot be created. This action
          cannot be undone.
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
