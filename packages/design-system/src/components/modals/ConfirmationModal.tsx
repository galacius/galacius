import { FC, ReactNode } from "react";
import { Button } from "../../atoms/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogSize,
  DialogTitle,
} from "../../atoms/dialog";
import { Loader2Icon } from "../../atoms/icon";

interface ConfirmationModalProps {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  confirmVariant?: "default" | "destructive";
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  size?: DialogSize;
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "default",
  isPending,
  onClose,
  onConfirm,
  size = "md",
}) => (
  <Dialog
    open={open}
    onOpenChange={(o) => {
      if (!o && !isPending) onClose();
    }}
  >
    <DialogContent size={size}>
      <DialogHeader>
        <DialogTitle className="text-h2 flex gap-2">{title}</DialogTitle>
      </DialogHeader>

      <p className="text-body text-muted-foreground">{description}</p>

      <DialogFooter>
        <Button variant="outline" disabled={isPending} onClick={onClose}>
          Cancel
        </Button>
        <Button variant={confirmVariant} disabled={isPending} onClick={onConfirm}>
          {isPending && <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
