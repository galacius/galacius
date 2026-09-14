import { FC, ReactNode } from "react";
import { cn } from "../../utils/common";

export interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export const ButtonGroup: FC<ButtonGroupProps> = ({ children, className }) => (
  <div
    data-slot="button-group"
    className={cn(
      "flex -space-x-px [&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:focus-visible]:z-10 [&>button:last-child]:rounded-r-lg",
      className
    )}
  >
    {children}
  </div>
);
