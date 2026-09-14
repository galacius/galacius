import {
  Button,
  DropdownMenuItem,
  DropletIcon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@galacius/design-system";

import { FC } from "react";

interface NodeDrainButtonProps {
  onClick: () => void;
  mode?: "menu-item" | "icon-button";
  ariaLabel?: string;
  disabled?: boolean;
}

export const NodeDrainButton: FC<NodeDrainButtonProps> = ({
  onClick,
  mode = "menu-item",
  ariaLabel = "Drain",
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
              <DropletIcon />
            </Button>
          }
        />
        <TooltipContent side="bottom">Drain</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenuItem disabled={disabled} onClick={onClick}>
      <DropletIcon className="mr-2 size-3.5" />
      Drain
    </DropdownMenuItem>
  );
};
