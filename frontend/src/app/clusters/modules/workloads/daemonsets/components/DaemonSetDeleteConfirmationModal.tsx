import { ConfirmationModal } from "@galacius/design-system";
import { FC, useMemo } from "react";

interface DaemonSetDeleteConfirmationModalProps {
  open: boolean;
  mode: "single" | "bulk";
  name?: string;
  namespace?: string;
  items?: Array<{ name: string; namespace: string }>;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DaemonSetDeleteConfirmationModal: FC<DaemonSetDeleteConfirmationModalProps> = ({
  open,
  mode,
  name,
  namespace,
  items,
  isPending,
  onClose,
  onConfirm,
}) => {
  const namespaces = useMemo(() => {
    if (mode === "single") return [];
    const set = new Set(items?.map((item) => item.namespace) ?? []);
    return Array.from(set);
  }, [mode, items]);

  const { title, description } = useMemo(() => {
    if (mode === "single") {
      return {
        title: (
          <>
            Delete DaemonSet:{" "}
            <span className="font-mono font-normal text-muted-foreground">{name}</span>
          </>
        ),
        description: (
          <>
            This will permanently delete{" "}
            <span className="font-mono font-medium text-foreground">{name}</span> from namespace{" "}
            <span className="font-mono font-medium text-foreground">{namespace}</span>. All
            associated resources will be removed.
          </>
        ),
      };
    }

    const count = items?.length ?? 0;
    const titleText = `Delete ${count} DaemonSet${count === 1 ? "" : "s"}`;

    const descriptionElement = (() => {
      if (namespaces.length === 1) {
        const nsName = namespaces[0];
        return (
          <>
            This will permanently delete {count} daemonset{count === 1 ? "" : "s"} from namespace{" "}
            <span className="font-mono font-medium text-foreground">{nsName}</span>. All associated
            resources will be removed.
          </>
        );
      }
      return (
        <>
          This will permanently delete {count} daemonsets from {namespaces.length} namespaces. All
          associated resources will be removed.
        </>
      );
    })();

    return {
      title: titleText,
      description: descriptionElement,
    };
  }, [mode, name, namespace, items, namespaces]);

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
