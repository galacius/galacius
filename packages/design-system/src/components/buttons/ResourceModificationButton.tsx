import { FC } from "react";
import { Button } from "../../atoms/button";
import { DropdownMenuItem } from "../../atoms/dropdown-menu";
import { PencilIcon } from "../../atoms/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../atoms/tooltip";

interface ResourceModificationButtonProps {
  onClick: () => void;
  mode?: "menu-item" | "icon-button";
  ariaLabel?: string;
  disabled?: boolean;
}

export const ResourceModificationButton: FC<ResourceModificationButtonProps> = ({
  onClick,
  mode = "menu-item",
  ariaLabel = "Edit",
  disabled,
}) => {
  if (mode === "icon-button") {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={ariaLabel}
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={onClick}
            >
              <PencilIcon />
            </Button>
          }
        />
        <TooltipContent side="bottom">Edit</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenuItem disabled={disabled} onClick={onClick}>
      <PencilIcon className="mr-2 size-3.5" />
      Edit
    </DropdownMenuItem>
  );
};
