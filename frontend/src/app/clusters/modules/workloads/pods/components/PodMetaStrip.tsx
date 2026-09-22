import { TruncatedText } from "@galacius/design-system";
import { FC } from "react";
import type { TrayTab } from "./PodTray";

export const PodMetaStrip: FC<{ tab: TrayTab }> = ({ tab }) => (
  <div className="flex min-w-0 items-center gap-2 overflow-hidden">
    <TruncatedText
      text={tab.ns}
      className="rounded-full border bg-muted/30 px-2 font-sans text-[11px]"
    />
    <span className="shrink-0 text-[11px] text-muted-foreground/50">·</span>
    {tab.ownerKind && tab.ownerName && (
      <>
        <TruncatedText
          text={`${tab.ownerKind}: ${tab.ownerName}`}
          className="font-sans text-[11px] text-muted-foreground"
        />
        <span className="shrink-0 text-[11px] text-muted-foreground/50">·</span>
      </>
    )}
    <TruncatedText text={`Pod: ${tab.pod}`} className="font-mono text-xs font-medium" />
    <span className="h-4 w-px shrink-0 bg-border" />
  </div>
);
