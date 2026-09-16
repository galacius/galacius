import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/common";

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 w-full min-w-0 text-base outline-none transition-theme file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium md:text-sm",
  {
    variants: {
      variant: {
        default:
          "border-input focus-ring disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-8 rounded-lg border bg-transparent px-2.5 py-1",
        ghost:
          "rounded-none border-0 border-b border-b-primary bg-transparent px-0 py-0.5 shadow-none focus-visible:ring-0",
      },
      state: {
        default: "",
        error:
          "border-destructive bg-destructive/5 dark:border-destructive/50 dark:bg-destructive/10",
        success: "border-success bg-success/5 dark:border-success dark:bg-success/5",
        warning: "border-warning bg-warning/5 dark:border-warning dark:bg-warning/5",
        loading: "opacity-75 cursor-not-allowed",
      },
    },
    defaultVariants: {
      variant: "default",
      state: "default",
    },
  }
);

interface InputProps extends React.ComponentProps<"input">, VariantProps<typeof inputVariants> {}

function Input({ className, type, variant, state, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, state }), className)}
      {...props}
    />
  );
}

export { Input };
