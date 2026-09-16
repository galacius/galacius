import { FC } from "react";
import { Button } from "../../atoms/button";
import { DropdownMenuItem } from "../../atoms/dropdown-menu";
import { RefreshCwIcon } from "../../atoms/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../atoms/tooltip";

interface ResourceRestartButtonProps {
  onClick: () => void;
  mode?: "menu-item" | "icon-button";
  ariaLabel?: string;
  disabled?: boolean;
}

export const ResourceRestartButton: FC<ResourceRestartButtonProps> = ({
  onClick,
  mode = "menu-item",
  ariaLabel = "Restart",
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
              <RefreshCwIcon />
            </Button>
          }
        />
        <TooltipContent side="bottom">Restart</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenuItem disabled={disabled} onClick={onClick}>
      <RefreshCwIcon className="mr-2 size-3.5" />
      Restart
    </DropdownMenuItem>
  );
};
