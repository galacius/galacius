import { FC } from "react";
import { Button } from "../../atoms/button";
import { DropdownMenuItem } from "../../atoms/dropdown-menu";
import { PlayIcon } from "../../atoms/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../atoms/tooltip";

interface ResourceResumeButtonProps {
  onClick: () => void;
  mode?: "menu-item" | "icon-button";
  ariaLabel?: string;
  disabled?: boolean;
}

export const ResourceResumeButton: FC<ResourceResumeButtonProps> = ({
  onClick,
  mode = "menu-item",
  ariaLabel = "Resume",
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
              <PlayIcon />
            </Button>
          }
        />
        <TooltipContent side="bottom">Resume</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenuItem disabled={disabled} onClick={onClick}>
      <PlayIcon className="mr-2 size-3.5" />
      Resume
    </DropdownMenuItem>
  );
};
