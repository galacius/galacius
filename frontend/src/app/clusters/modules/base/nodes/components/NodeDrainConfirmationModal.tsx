import { ConfirmationModal } from "@galacius/design-system";
import { FC } from "react";

interface NodeDrainConfirmationModalProps {
  open: boolean;
  name: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const NodeDrainConfirmationModal: FC<NodeDrainConfirmationModalProps> = ({
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
        Drain Node: <span className="font-mono font-normal text-muted-foreground">{name}</span>
      </>
    }
    description={
      <>
        This will cordon the node and evict all Pods gracefully via the Eviction API. Pods protected
        by PodDisruptionBudgets may be blocked. DaemonSet-managed and static Pods will not be
        evicted.
      </>
    }
    confirmLabel="Drain"
    confirmVariant="destructive"
    isPending={isPending}
    onClose={onClose}
    onConfirm={onConfirm}
  />
);
