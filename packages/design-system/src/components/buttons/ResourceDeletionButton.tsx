import { FC } from "react";
import { Button } from "../../atoms/button";
import { DropdownMenuItem } from "../../atoms/dropdown-menu";
import { Loader2Icon, Trash2Icon } from "../../atoms/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../atoms/tooltip";

interface ResourceDeletionButtonProps {
  onClick: () => void;
  mode?: "menu-item" | "icon-button";
  ariaLabel?: string;
  disabled?: boolean;
  isPending?: boolean;
  label?: string;
  className?: string;
}

export const ResourceDeletionButton: FC<ResourceDeletionButtonProps> = ({
  onClick,
  mode = "menu-item",
  ariaLabel = "Delete",
  disabled,
  isPending,
  label = "Delete",
  className,
}) => {
  const isDisabled = disabled || isPending;

  if (mode === "icon-button") {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={ariaLabel}
              variant="ghost"
              size="icon-sm"
              disabled={isDisabled}
              onClick={onClick}
              className={className}
            >
              {isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
            </Button>
          }
        />
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenuItem disabled={isDisabled} onClick={onClick} className={className}>
      {isPending ? (
        <Loader2Icon className="mr-2 size-3.5 animate-spin" />
      ) : (
        <Trash2Icon className="mr-2 size-3.5" />
      )}
      {label}
    </DropdownMenuItem>
  );
};
