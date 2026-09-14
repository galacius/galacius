import { FC } from "react";
import { ResourceLink } from "./resources/ResourceLink";

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface LegendItem {
  label: string;
  color: "green" | "amber" | "red";
  count: number;
}

interface DonutChartProps {
  label: string;
  total: number;
  running: number;
  pending?: number;
  failed?: number;
  items: LegendItem[];
  onNavigate?: () => void;
  isLoading?: boolean;
}

const colorClass: Record<LegendItem["color"], string> = {
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-destructive",
};

export const DonutChart: FC<DonutChartProps> = ({
  label,
  total,
  running,
  pending = 0,
  failed = 0,
  items,
  onNavigate,
  isLoading = false,
}) => {
  const runRatio = total === 0 ? 0 : running / total;
  const pendingRatio = total === 0 ? 0 : pending / total;
  const failRatio = total === 0 ? 0 : failed / total;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs">
        <ResourceLink onClick={onNavigate}>
          {isLoading ? label : `${label} (${total})`}
        </ResourceLink>
      </span>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle
          cx="44"
          cy="44"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          className={isLoading ? "animate-pulse stroke-muted" : "stroke-muted"}
        />
        {!isLoading && (
          <>
            <circle
              cx="44"
              cy="44"
              r={RADIUS}
              fill="none"
              strokeWidth="8"
              strokeDasharray={`${runRatio * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
              className="stroke-success"
              transform="rotate(-90 44 44)"
            />
            {pending > 0 && (
              <circle
                cx="44"
                cy="44"
                r={RADIUS}
                fill="none"
                strokeWidth="8"
                strokeDasharray={`${pendingRatio * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                className="stroke-warning"
                transform={`rotate(${-90 + runRatio * 360} 44 44)`}
              />
            )}
            {failed > 0 && (
              <circle
                cx="44"
                cy="44"
                r={RADIUS}
                fill="none"
                strokeWidth="8"
                strokeDasharray={`${failRatio * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeLinecap="round"
                className="stroke-destructive"
                transform={`rotate(${-90 + (runRatio + pendingRatio) * 360} 44 44)`}
              />
            )}
          </>
        )}
      </svg>
      <div className="mt-1 flex flex-col gap-1">
        {isLoading ? (
          <div className="h-3 w-16 animate-pulse rounded-sm bg-muted" />
        ) : (
          items.flatMap((i) =>
            i.count > 0
              ? [
                  <div key={i.label} className="flex items-center gap-1.5 text-xs">
                    <span className={`h-2 w-2 shrink-0 rounded-sm ${colorClass[i.color]}`} />
                    <span className="text-muted-foreground">
                      {i.label}: {i.count}
                    </span>
                  </div>,
                ]
              : []
          )
        )}
      </div>
    </div>
  );
};
