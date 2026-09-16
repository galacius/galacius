import { ConfirmationModal } from "@galacius/design-system";
import { FC, useMemo } from "react";

interface ValidatingWebhookConfigDeleteConfirmationModalProps {
  open: boolean;
  mode: "single" | "bulk";
  name?: string;
  items?: string[];
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ValidatingWebhookConfigDeleteConfirmationModal: FC<
  ValidatingWebhookConfigDeleteConfirmationModalProps
> = ({ open, mode, name, items, isPending, onClose, onConfirm }) => {
  const { title, description } = useMemo(() => {
    if (mode === "single") {
      return {
        title: (
          <>
            Delete Validating Webhook Configuration:{" "}
            <span className="font-mono font-normal text-muted-foreground">{name}</span>
          </>
        ),
        description: (
          <>
            This will permanently delete{" "}
            <span className="font-mono font-medium text-foreground">{name}</span>. This action
            cannot be undone.
          </>
        ),
      };
    }

    const count = items?.length ?? 0;

    return {
      title: `Delete ${count} Validating Webhook Configuration${count === 1 ? "" : "s"}`,
      description: (
        <>
          This will permanently delete {count} Validating Webhook Configuration
          {count === 1 ? "" : "s"}. This action cannot be undone.
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
