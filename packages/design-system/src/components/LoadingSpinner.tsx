import { FC } from "react";
import { Loader2Icon } from "../atoms/icon";
import { cn } from "../utils/common";

export interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({ className }) => (
  <div className={cn("flex h-full items-center justify-center", className)}>
    <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
  </div>
);
