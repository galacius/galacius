import { ConfirmationModal } from "@galacius/design-system";
import { FC } from "react";

interface NodeUncordonConfirmationModalProps {
  open: boolean;
  name: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const NodeUncordonConfirmationModal: FC<NodeUncordonConfirmationModalProps> = ({
  open,
  name,
  isPending,
  onClose,
  onConfirm,
}) => (
  <ConfirmationModal
    open={open}
    title={
      <>
        Uncordon Node: <span className="font-mono font-normal text-muted-foreground">{name}</span>
      </>
    }
    description={
      <>
        This will mark <span className="font-mono font-medium text-foreground">{name}</span> as
        schedulable again, allowing new Pods to be scheduled on it.
      </>
    }
    confirmLabel="Uncordon"
    confirmVariant="default"
    isPending={isPending}
    onClose={onClose}
    onConfirm={onConfirm}
  />
);
