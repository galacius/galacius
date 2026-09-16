import { ConfirmationModal } from "@galacius/design-system";
import { FC } from "react";

interface CronJobResumeConfirmationModalProps {
  open: boolean;
  name: string;
  namespace: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CronJobResumeConfirmationModal: FC<CronJobResumeConfirmationModalProps> = ({
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
        Resume CronJob: <span className="font-mono font-normal text-muted-foreground">{name}</span>
      </>
    }
    description={
      <>
        This will resume the schedule for{" "}
        <span className="font-mono font-medium text-foreground">{name}</span> in namespace{" "}
        <span className="font-mono font-medium text-foreground">{namespace}</span>. New Jobs will
        start being created on its next scheduled run.
      </>
    }
    confirmLabel="Resume"
    isPending={isPending}
    onClose={onClose}
    onConfirm={onConfirm}
  />
);
