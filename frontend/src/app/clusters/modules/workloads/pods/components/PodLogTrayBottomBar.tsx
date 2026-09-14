import { Button, Checkbox, DownloadIcon, cn } from "@galacius/design-system";
import { FC } from "react";
import type { LogTabOptions } from "./PodLogTrayContent";

interface PodLogTrayBottomBarProps {
  collapsed: boolean;
  opts: LogTabOptions;
  updateOpts: <K extends keyof LogTabOptions>(key: K, value: LogTabOptions[K]) => void;
  onDownload: () => void;
  downloading: boolean;
}

export const PodLogTrayBottomBar: FC<PodLogTrayBottomBarProps> = ({
  collapsed,
  opts,
  updateOpts,
  onDownload,
  downloading,
}) => (
  <div
    className={cn(
      "flex h-9 shrink-0 items-center justify-between border-t px-3",
      collapsed && "hidden"
    )}
  >
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Checkbox
          aria-label="Show timestamps"
          checked={opts.showTimestamps}
          onCheckedChange={(v) => updateOpts("showTimestamps", Boolean(v))}
        />
        <span className="select-none">Show timestamps</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Checkbox
          aria-label="Word wrap"
          checked={opts.wrap}
          onCheckedChange={(v) => updateOpts("wrap", Boolean(v))}
        />
        <span className="select-none">Word wrap</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Checkbox
          aria-label="Show prev. terminated"
          checked={opts.showPrevTerminated}
          onCheckedChange={(v) => updateOpts("showPrevTerminated", Boolean(v))}
        />
        <span className="select-none">Show prev. terminated</span>
      </div>
    </div>

    <Button
      variant="ghost"
      size="xs"
      className="gap-1.5"
      aria-label="Download logs"
      onClick={onDownload}
      disabled={downloading}
    >
      <DownloadIcon className="size-3.5" />
      Download
    </Button>
  </div>
);
