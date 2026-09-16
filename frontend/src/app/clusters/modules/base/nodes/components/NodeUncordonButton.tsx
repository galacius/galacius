import {
  Button,
  DropdownMenuItem,
  PlayIcon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@galacius/design-system";

import { FC } from "react";

interface NodeUncordonButtonProps {
  onClick: () => void;
  mode?: "menu-item" | "icon-button";
  ariaLabel?: string;
  disabled?: boolean;
}

export const NodeUncordonButton: FC<NodeUncordonButtonProps> = ({
  onClick,
  mode = "menu-item",
  ariaLabel = "Uncordon",
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
        <TooltipContent side="bottom">Uncordon</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenuItem disabled={disabled} onClick={onClick}>
      <PlayIcon className="mr-2 size-3.5" />
      Uncordon
    </DropdownMenuItem>
  );
};
