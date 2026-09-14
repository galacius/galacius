import { cva } from "class-variance-authority";

export const textareaVariants = cva(
  // base classes shared across all variants:
  "min-w-0 w-full outline-none transition-theme resize-none placeholder:text-muted-foreground",
  {
    variants: {
      variant: {
        default:
          "bg-transparent border border-input rounded-lg px-2.5 py-1 text-sm min-h-[80px] focus-ring disabled:bg-input/50 disabled:cursor-not-allowed disabled:opacity-50 dark:disabled:bg-input/80",
        code:
          // only textarea-specific classes; the outer container is handled in the component
          "flex-1 bg-transparent py-2 pl-3 font-mono text-xs text-zinc-200 disabled:cursor-default leading-[1.25rem]",
        yaml: "",
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
