import { cn } from "@galacius/design-system";
import "@xterm/xterm/css/xterm.css";
import { FC } from "react";
import { type StreamStatus } from "../hooks/usePodLogs";

export interface LogsPanelProps {
  containerRef: (node: HTMLDivElement | null) => void;
  status: StreamStatus;
  error: string | null;
  wrap: boolean;
}

export const LogsPanel: FC<LogsPanelProps> = ({ containerRef, status, error, wrap }) => {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-y-hidden",
          // xterm draws its own custom scrollbar (.xterm-scrollable-element >
          // .scrollbar), positioned `right: 0` relative to the terminal's
          // internal content box — not the visible viewport. Once wrap is off
          // and the terminal is widened beyond the panel to avoid wrapping,
          // that box is wider than what's visible, so the scrollbar drifts to
          // the right edge of the (mostly offscreen) content instead of
          // staying docked to the panel edge. Hiding it here — scrolling
          // itself is driven by xterm's internal wheel handler, not this
          // decoration, so functionality is unaffected.
          "[&_.xterm-scrollable-element>.scrollbar]:hidden",
          wrap ? "overflow-x-hidden" : "overflow-x-auto"
        )}
      >
        <div ref={containerRef} className="absolute inset-0" />
        {status === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="animate-pulse text-xs text-muted-foreground">Connecting…</span>
          </div>
        )}
        {status === "error" && error && (
          <div className="absolute right-0 bottom-0 left-0 bg-destructive/80 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
