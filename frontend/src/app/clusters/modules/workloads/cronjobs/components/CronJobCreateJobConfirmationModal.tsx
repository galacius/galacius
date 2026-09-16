import { ConfirmationModal } from "@galacius/design-system";
import { FC } from "react";

interface CronJobCreateJobConfirmationModalProps {
  open: boolean;
  name: string;
  namespace: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CronJobCreateJobConfirmationModal: FC<CronJobCreateJobConfirmationModalProps> = ({
  open,
  name,
  namespace,
  isPending,
  onClose,
  onConfirm,
}) => (
  <ConfirmationModal
    open={open}
    title={
      <>
        Run CronJob Now: <span className="font-mono font-normal text-muted-foreground">{name}</span>
      </>
    }
    description={
      <>
        This will immediately create a new Job from{" "}
        <span className="font-mono font-medium text-foreground">{name}</span>'s template in
        namespace <span className="font-mono font-medium text-foreground">{namespace}</span>,
        independent of its schedule.
      </>
    }
    confirmLabel="Run Now"
    isPending={isPending}
    onClose={onClose}
    onConfirm={onConfirm}
  />
);
