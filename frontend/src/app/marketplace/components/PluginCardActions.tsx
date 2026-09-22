import {
  Button,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Trash2Icon,
} from "@galacius/design-system";
import { FC } from "react";

interface PluginCardActionsProps {
  isPluginDisabled: boolean;
  isDisabling: boolean;
  isEnabling: boolean;
  isRemoving: boolean;
  onEnableOrDisableClick: () => void;
  onRemoveClick: () => void;
}

// The enable/disable and remove icon buttons shown in a READY, CRASHED, or
// disabled plugin's card header. Split out from PluginCard so its own
// enable/disable/loading branching doesn't add to PluginCard's complexity.
export const PluginCardActions: FC<PluginCardActionsProps> = ({
  isPluginDisabled,
  isDisabling,
  isEnabling,
  isRemoving,
  onEnableOrDisableClick,
  onRemoveClick,
}) => {
  const isBusy = isDisabling || isEnabling;

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={onEnableOrDisableClick}
              disabled={isBusy}
              aria-label={isPluginDisabled ? "Enable plugin" : "Disable plugin"}
            >
              {isBusy ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : isPluginDisabled ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </Button>
          }
        />
        <TooltipContent>{isPluginDisabled ? "Enable plugin" : "Disable plugin"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemoveClick}
              disabled={isRemoving}
              aria-label="Remove plugin"
            >
              {isRemoving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Trash2Icon className="size-4" />
              )}
            </Button>
          }
        />
        <TooltipContent>Remove plugin</TooltipContent>
      </Tooltip>
    </>
  );
};
