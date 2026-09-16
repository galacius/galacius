import { ConfirmationModal } from "@galacius/design-system";
import { FC } from "react";

interface NodeCordonConfirmationModalProps {
  open: boolean;
  name: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const NodeCordonConfirmationModal: FC<NodeCordonConfirmationModalProps> = ({
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
        Cordon Node: <span className="font-mono font-normal text-muted-foreground">{name}</span>
      </>
    }
    description={
      <>
        This will mark <span className="font-mono font-medium text-foreground">{name}</span> as
        unschedulable, preventing new Pods from being scheduled on it. Existing Pods will not be
        evicted.
      </>
    }
    confirmLabel="Cordon"
    confirmVariant="destructive"
    isPending={isPending}
    onClose={onClose}
    onConfirm={onConfirm}
  />
);
