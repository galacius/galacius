import { ConfirmationModal } from "@galacius/design-system";
import { FC, useMemo } from "react";

interface LimitRangeDeleteConfirmationModalProps {
  open: boolean;
  mode: "single" | "bulk";
  lrName?: string;
  lrNamespace?: string;
  items?: Array<{ lrName: string; lrNamespace: string }>;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LimitRangeDeleteConfirmationModal: FC<LimitRangeDeleteConfirmationModalProps> = ({
  open,
  mode,
  lrName,
  lrNamespace,
  items,
  isPending,
  onClose,
  onConfirm,
}) => {
  const namespaces = useMemo(() => {
    if (mode === "single") return [];
    const set = new Set(items?.map((item) => item.lrNamespace) ?? []);
    return Array.from(set);
  }, [mode, items]);

  const { title, description } = useMemo(() => {
    if (mode === "single") {
      return {
        title: (
          <>
            Delete Limit Range:{" "}
            <span className="font-mono font-normal text-muted-foreground">{lrName}</span>
          </>
        ),
        description: (
          <>
            This will permanently delete{" "}
            <span className="font-mono font-medium text-foreground">{lrName}</span> from namespace{" "}
            <span className="font-mono font-medium text-foreground">{lrNamespace}</span>. All
            associated resources will be removed.
          </>
        ),
      };
    }

    const count = items?.length ?? 0;
    const titleText = `Delete ${count} Limit Range${count === 1 ? "" : "s"}`;

    const descriptionElement = (() => {
      if (namespaces.length === 1) {
        const nsName = namespaces[0];
        return (
          <>
            This will permanently delete {count} limitrange{count === 1 ? "" : "s"} from namespace{" "}
            <span className="font-mono font-medium text-foreground">{nsName}</span>. All associated
            resources will be removed.
          </>
        );
      }
      return (
        <>
          This will permanently delete {count} limitranges from {namespaces.length} namespaces. All
          associated resources will be removed.
        </>
      );
    })();

    return {
      title: titleText,
      description: descriptionElement,
    };
  }, [mode, lrName, lrNamespace, items, namespaces]);

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
