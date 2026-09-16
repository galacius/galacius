import { Sheet, SheetContent, SheetHeader } from "../../atoms/sheet";
import { ScrollArea } from "../../atoms/scroll-area";
import { cn } from "../../utils/common";
import { FC, PropsWithChildren } from "react";

export interface ResourceDetailEmptyBodyProps {
  resourceKind: string;
}

export const ResourceDetailEmptyBody: FC<ResourceDetailEmptyBodyProps> = ({ resourceKind }) => (
  <p className="p-4 text-xs text-muted-foreground">
    There are no information for this {resourceKind}.
  </p>
);

export interface ResourceDetailDrawerProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  className?: string;
}

export const ResourceDetailDrawer: FC<ResourceDetailDrawerProps> = ({
  open,
  onClose,
  children,
  className,
}) => {
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className={cn("flex w-200 flex-col gap-0 p-0 sm:max-w-200", className)}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
};

/** Wraps SheetHeader with standard drawer styling: flex row, centered items, bottom border, and consistent padding. */
export const ResourceDetailDrawerHeader: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <SheetHeader
    className={cn("flex flex-row items-center justify-between border-b px-4 py-3", className)}
  >
    {children}
  </SheetHeader>
);

interface ResourceDetailDrawerBodyProps extends PropsWithChildren {
  /** Optional className for the inner content wrapper; use for p-0 or custom grid layouts. */
  className?: string;
}

/** Wraps ScrollArea with standard drawer body scrolling; provides inner p-4 padding by default. */
export const ResourceDetailDrawerBody: FC<ResourceDetailDrawerBodyProps> = ({
  children,
  className,
}) => (
  <ScrollArea className="h-full">
    <div className={cn("p-4", className)}>{children}</div>
  </ScrollArea>
);
