import { Tooltip, TooltipContent, TooltipTrigger, cn } from "@galacius/design-system";
import { FC } from "react";
import type { TrayTab } from "./PodTray";

const TruncatedLabel: FC<{ text: string; className?: string }> = ({ text, className }) => (
  <Tooltip>
    <TooltipTrigger render={<span className={cn("min-w-0 truncate", className)}>{text}</span>} />
    <TooltipContent>{text}</TooltipContent>
  </Tooltip>
);

export const PodMetaStrip: FC<{ tab: TrayTab }> = ({ tab }) => (
  <div className="flex min-w-0 items-center gap-2 overflow-hidden">
    <TruncatedLabel
      text={tab.ns}
      className="inline-block rounded-full border bg-muted/30 px-2 text-[11px]"
    />
    <span className="shrink-0 text-[11px] text-muted-foreground/50">·</span>
    {tab.ownerKind && tab.ownerName && (
      <>
        <TruncatedLabel
          text={`${tab.ownerKind}: ${tab.ownerName}`}
          className="text-[11px] text-muted-foreground"
        />
        <span className="shrink-0 text-[11px] text-muted-foreground/50">·</span>
      </>
    )}
    <TruncatedLabel text={`Pod: ${tab.pod}`} className="font-mono text-xs font-medium" />
    <span className="h-4 w-px shrink-0 bg-border" />
  </div>
);
