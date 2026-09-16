import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/common";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-interactive focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/75 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/15 text-destructive border-transparent focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        success:
          "bg-success/15 text-success border-transparent focus-visible:ring-success/20 dark:focus-visible:ring-success/40 [a]:hover:bg-success/20",
        warning:
          "bg-warning/15 text-warning border-transparent focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40 [a]:hover:bg-warning/20",
        info: "bg-info/15 text-info border-transparent focus-visible:ring-info/20 dark:focus-visible:ring-info/40 [a]:hover:bg-info/20",
        danger:
          "bg-danger/15 text-danger border-transparent focus-visible:ring-danger/20 dark:focus-visible:ring-danger/40 [a]:hover:bg-danger/20",
        ghost: "bg-muted text-muted-foreground border-transparent [a]:hover:bg-muted/70",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge };
