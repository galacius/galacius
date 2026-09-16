import { ConfirmationModal } from "@galacius/design-system";
import { FC, useMemo } from "react";

interface IngressClassDeleteConfirmationModalProps {
  open: boolean;
  mode: "single" | "bulk";
  name?: string;
  items?: Array<{ name: string }>;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const IngressClassDeleteConfirmationModal: FC<IngressClassDeleteConfirmationModalProps> = ({
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
            Delete Ingress Class:{" "}
            <span className="font-mono font-normal text-muted-foreground">{name}</span>
          </>
        ),
        description: (
          <>
            This will permanently delete{" "}
            <span className="font-mono font-medium text-foreground">{name}</span>. Ingresses may
            become unroutable if they reference this class. This action cannot be undone.
          </>
        ),
      };
    }

    const count = items?.length ?? 0;

    return {
      title: `Delete ${count} Ingress Class${count === 1 ? "" : "es"}`,
      description: (
        <>
          This will permanently delete {count} Ingress Class{count === 1 ? "" : "es"}. Ingresses may
          become unroutable if they reference these classes. This action cannot be undone.
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
