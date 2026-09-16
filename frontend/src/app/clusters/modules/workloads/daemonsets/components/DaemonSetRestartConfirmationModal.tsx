import { ConfirmationModal } from "@galacius/design-system";
import { FC } from "react";

interface DaemonSetRestartConfirmationModalProps {
  open: boolean;
  name: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DaemonSetRestartConfirmationModal: FC<DaemonSetRestartConfirmationModalProps> = ({
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
        Restart DaemonSet:{" "}
        <span className="font-mono font-normal text-muted-foreground">{name}</span>
      </>
    }
    description={
      <>
        This will trigger a rolling restart of{" "}
        <span className="font-mono font-medium text-foreground">{name}</span>. All pods will be
        replaced progressively.
      </>
    }
    confirmLabel="Restart"
    isPending={isPending}
    onClose={onClose}
    onConfirm={onConfirm}
  />
);
