import {
  Button,
  DropdownMenuItem,
  PauseIcon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@galacius/design-system";

import { FC } from "react";

interface NodeCordonButtonProps {
  onClick: () => void;
  mode?: "menu-item" | "icon-button";
  ariaLabel?: string;
  disabled?: boolean;
}

export const NodeCordonButton: FC<NodeCordonButtonProps> = ({
  onClick,
  mode = "menu-item",
  ariaLabel = "Cordon",
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
              <PauseIcon />
            </Button>
          }
        />
        <TooltipContent side="bottom">Cordon</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenuItem disabled={disabled} onClick={onClick}>
      <PauseIcon className="mr-2 size-3.5" />
      Cordon
    </DropdownMenuItem>
  );
};
