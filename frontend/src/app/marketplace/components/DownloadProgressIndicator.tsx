import { FC } from "react";

interface DownloadProgressIndicatorProps {
  progress?: number; // 0-100 for downloading
  isVerifying?: boolean; // true for verifying state
  isVisible?: boolean; // show/hide
}

export const DownloadProgressIndicator: FC<DownloadProgressIndicatorProps> = ({
  progress = 0,
  isVerifying = false,
  isVisible = false,
}) => {
  if (!isVisible) return null;
  return (
    <div className="w-full">
      <div className="h-0.5 overflow-hidden rounded-full bg-muted">
        {isVerifying ? (
          // Pulse animation while verifying
          <div className="h-full animate-pulse bg-amber-500" />
        ) : (
          // Percentage-driven width while downloading
          <div
            className="h-full bg-amber-500 transition-[width] duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        )}
      </div>
      {!isVerifying && progress > 0 && (
        <div className="mt-1 text-xs text-muted-foreground">{Math.round(progress)}%</div>
      )}
      {isVerifying && <div className="mt-1 text-xs text-muted-foreground">Verifying...</div>}
    </div>
  );
};
