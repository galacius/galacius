import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "../utils/common";
import { CheckIcon } from "./icon";

const CHECKBOX_STATE_CLASSES: Record<
  "default" | "error" | "success" | "warning" | "loading",
  string
> = {
  default: "",
  error:
    "border-destructive aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  success: "border-success data-checked:border-success data-checked:bg-success",
  warning: "border-warning data-checked:border-warning data-checked:bg-warning",
  loading: "opacity-75 cursor-not-allowed",
};

function Checkbox({
  className,
  state = "default",
  ...props
}: CheckboxPrimitive.Root.Props & {
  state?: "default" | "error" | "success" | "warning" | "loading";
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "focus-ring transition-theme peer relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-input outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        CHECKBOX_STATE_CLASSES[state],
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
