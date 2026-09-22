import { InfoIcon, Tooltip, TooltipContent, TooltipTrigger } from "@galacius/design-system";
import { FC } from "react";

interface Props {
  updateInfo: { latestVersion: string; releaseURL: string };
  onUpdateClick: () => void;
}

export const Updater: FC<Props> = ({ updateInfo, onUpdateClick }) => (
  <Tooltip>
    <TooltipTrigger
      onClick={onUpdateClick}
      className="flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
    >
      <InfoIcon className="size-3.5" />
      Update available
    </TooltipTrigger>
    <TooltipContent side="top" align="end">
      Version {updateInfo.latestVersion} is available to download
    </TooltipContent>
  </Tooltip>
);
