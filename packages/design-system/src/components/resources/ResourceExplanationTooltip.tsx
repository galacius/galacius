import { CircleHelpIcon } from "../../atoms/icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../atoms/tooltip";
import { cn } from "../../utils/common";
import { FC, ReactNode } from "react";

interface ResourceExplanationTooltipProps {
  description: ReactNode;
  docsUrl: string;
  onOpenDocs: (url: string) => void;
  classNames?: {
    trigger?: string;
    content?: string;
  };
}

export const ResourceExplanationTooltip: FC<ResourceExplanationTooltipProps> = ({
  description,
  docsUrl,
  onOpenDocs,
  classNames,
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={classNames?.trigger}
          render={
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-white">
              <CircleHelpIcon className="size-4 text-muted-foreground" />
            </span>
          }
        />
        <TooltipContent className={cn("max-w-md", classNames?.content)} side="bottom">
          <div className="flex flex-col gap-2">
            <span>{description}</span>
            <span className="text-left">
              For more detail:{" "}
              <button
                type="button"
                onClick={() => onOpenDocs(docsUrl)}
                className="cursor-pointer underline"
              >
                {docsUrl}
              </button>
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
