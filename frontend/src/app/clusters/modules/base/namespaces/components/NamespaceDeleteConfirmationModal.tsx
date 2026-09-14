import { ConfirmationModal } from "@galacius/design-system";
import { FC, useMemo } from "react";

interface NamespaceDeleteConfirmationModalProps {
  open: boolean;
  mode: "single" | "bulk";
  name?: string;
  items?: string[];
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const NamespaceDeleteConfirmationModal: FC<NamespaceDeleteConfirmationModalProps> = ({
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
            Delete Namespace:{" "}
            <span className="font-mono font-normal text-muted-foreground">{name}</span>
          </>
        ),
        description: (
          <>
            This will permanently delete{" "}
            <span className="font-mono font-medium text-foreground">{name}</span> and all resources
            within it (Pods, Deployments, ConfigMaps, Secrets, etc.). This action cannot be undone.
          </>
        ),
      };
    }

    const count = items?.length ?? 0;

    return {
      title: `Delete ${count} Namespace${count === 1 ? "" : "s"}`,
      description: (
        <>
          This will permanently delete {count} namespace{count === 1 ? "" : "s"} and all resources
          within {count === 1 ? "it" : "them"} (Pods, Deployments, ConfigMaps, Secrets, etc.). This
          action cannot be undone.
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
