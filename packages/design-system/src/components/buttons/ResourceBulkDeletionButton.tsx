import { FC } from "react";
import { Button } from "../../atoms/button";
import { MinusIcon } from "../../atoms/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../atoms/tooltip";

interface ResourceBulkDeletionButtonProps {
  count: number;
  ariaLabel: string;
  tooltip: string;
  onClick: () => void;
}

export const ResourceBulkDeletionButton: FC<ResourceBulkDeletionButtonProps> = ({
  count,
  ariaLabel,
  tooltip,
  onClick,
}) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          size="icon-sm"
          variant="destructive"
          className="relative rounded-full"
          disabled={count === 0}
          aria-label={ariaLabel}
          onClick={onClick}
        >
          <MinusIcon className="size-3.5" />
          {count > 0 && (
            <span className="absolute -top-2.5 -right-2.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </Button>
      }
    />
    <TooltipContent>{tooltip}</TooltipContent>
  </Tooltip>
);
