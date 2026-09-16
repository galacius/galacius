import { FC } from "react";
import { Button } from "../../atoms/button";
import { DropdownMenuItem } from "../../atoms/dropdown-menu";
import { RocketIcon } from "../../atoms/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../atoms/tooltip";

interface ResourceRunNowButtonProps {
  onClick: () => void;
  mode?: "menu-item" | "icon-button";
  ariaLabel?: string;
  disabled?: boolean;
}

export const ResourceRunNowButton: FC<ResourceRunNowButtonProps> = ({
  onClick,
  mode = "menu-item",
  ariaLabel = "Run Now",
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
              <RocketIcon />
            </Button>
          }
        />
        <TooltipContent side="bottom">Run Now</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenuItem disabled={disabled} onClick={onClick}>
      <RocketIcon className="mr-2 size-3.5" />
      Run Now
    </DropdownMenuItem>
  );
};
