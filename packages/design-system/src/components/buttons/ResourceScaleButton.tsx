import { FC } from "react";
import { Button } from "../../atoms/button";
import { DropdownMenuItem } from "../../atoms/dropdown-menu";
import { ScalingIcon } from "../../atoms/icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../atoms/tooltip";

interface ResourceScaleButtonProps {
  onClick: () => void;
  mode?: "menu-item" | "icon-button";
  ariaLabel?: string;
  disabled?: boolean;
  isNotAllowed?: boolean;
  notAllowedReason?: string;
}

export const ResourceScaleButton: FC<ResourceScaleButtonProps> = ({
  onClick,
  mode = "menu-item",
  ariaLabel = "Scale",
  disabled,
  isNotAllowed,
  notAllowedReason,
}) => {
  if (mode === "icon-button") {
    if (isNotAllowed) {
      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex">
                <Button aria-label={ariaLabel} variant="ghost" size="icon-sm" disabled>
                  <ScalingIcon />
                </Button>
              </span>
            }
          />
          <TooltipContent side="bottom">{notAllowedReason ?? "Not allowed"}</TooltipContent>
        </Tooltip>
      );
    }

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
              <ScalingIcon />
            </Button>
          }
        />
        <TooltipContent side="bottom">Scale</TooltipContent>
      </Tooltip>
    );
  }

  if (isNotAllowed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <span>
                <DropdownMenuItem disabled>
                  <ScalingIcon className="mr-2 size-3.5" />
                  Scale
                </DropdownMenuItem>
              </span>
            }
          />
          <TooltipContent side="left" positionerClassName="z-popover-nested">
            {notAllowedReason ?? "Not allowed"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenuItem disabled={disabled} onClick={onClick}>
      <ScalingIcon className="mr-2 size-3.5" />
      Scale
    </DropdownMenuItem>
  );
};
