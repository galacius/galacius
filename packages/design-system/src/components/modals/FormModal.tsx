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

interface FormModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose: () => void;
  title: string | ReactNode;
  children: ReactNode;
  onSubmit: () => void | Promise<void>;
  isLoading?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  size?: DialogSize;
}

export const FormModal: FC<FormModalProps> = ({
  open,
  onOpenChange,
  onClose,
  title,
  children,
  onSubmit,
  isLoading = false,
  submitDisabled = false,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  size = "md",
}) => (
  <Dialog
    open={open}
    onOpenChange={(o) => {
      if (!o && !isLoading) onClose();
      onOpenChange?.(o);
    }}
  >
    <DialogContent size={size}>
      <DialogHeader>
        <DialogTitle className="text-h2">{title}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">{children}</div>

      <DialogFooter>
        <Button variant="outline" disabled={isLoading} onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button disabled={isLoading || submitDisabled} onClick={onSubmit}>
          {isLoading && <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
