import { Button, RotateCcwIcon } from "@galacius/design-system";
import "@xterm/xterm/css/xterm.css";
import { FC } from "react";
import type { ExecStatus } from "../hooks/usePodExec";

export interface ExecPanelProps {
  containerRef: (node: HTMLDivElement | null) => void;
  status: ExecStatus;
  error: string | null;
  reconnect: () => void;
}

export const ExecPanel: FC<ExecPanelProps> = ({ containerRef, status, error, reconnect }) => (
  <div className="flex h-full flex-col">
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      {status === "connecting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="animate-pulse text-xs text-muted-foreground">Connecting…</span>
        </div>
      )}
      {status === "error" && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
          <span className="text-xs text-destructive">{error}</span>
          <Button variant="ghost" size="xs" onClick={reconnect}>
            <RotateCcwIcon className="size-3.5" />
            Reconnect
          </Button>
        </div>
      )}
      {status === "closed" && (
        <div className="absolute right-0 bottom-0 left-0 bg-muted/80 px-3 py-2 text-center text-xs text-muted-foreground">
          Session closed
        </div>
      )}
    </div>
  </div>
);
