import { cn } from "../../utils/common";
import { type FC, type ReactNode } from "react";

// ASCII/BMP case-fold only — sufficient for Kubernetes YAML (hostnames, keys, values).
// Non-BMP Unicode or locale-specific folding (e.g. ß↔ss) is not supported.
// absoluteStart: position of `text[0]` within the full source string — used to
// identify which occurrence is the active match (orange vs yellow).
interface SplitAndHighlightTextProps {
  text: string;
  term: string;
  absoluteStart?: number;
  activeMatchCharIdx?: number;
}

export const SplitAndHighlightText: FC<SplitAndHighlightTextProps> = ({
  text,
  term,
  absoluteStart,
  activeMatchCharIdx,
}) => {
  if (!term) return <>{text}</>;
  const lower = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const segments: ReactNode[] = [];
  let lastIdx = 0;
  let idx = lower.indexOf(lowerTerm, 0);
  while (idx !== -1) {
    if (idx > lastIdx)
      segments.push(<span key={`text-${lastIdx}`}>{text.slice(lastIdx, idx)}</span>);
    const isActive =
      absoluteStart !== undefined &&
      activeMatchCharIdx !== undefined &&
      activeMatchCharIdx >= 0 &&
      absoluteStart + idx === activeMatchCharIdx;
    segments.push(
      <mark
        key={`match-${idx}-${text.slice(idx, idx + term.length)}`}
        className={cn(
          "inline rounded-none bg-transparent px-0.5 py-0 text-inherit",
          isActive ? "border border-orange-400" : "border border-yellow-300"
        )}
      >
        {text.slice(idx, idx + term.length)}
      </mark>
    );
    lastIdx = idx + term.length;
    idx = lower.indexOf(lowerTerm, lastIdx);
  }
  if (lastIdx < text.length)
    segments.push(<span key={`text-${lastIdx}`}>{text.slice(lastIdx)}</span>);
  return <>{segments.length > 0 ? segments : text}</>;
};
