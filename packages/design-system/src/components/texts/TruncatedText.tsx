import { FC, useLayoutEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../atoms/tooltip";
import { cn } from "../../utils/common";

// Only 2-4 are supported (1 line uses the default single-line `truncate` behavior instead).
// Written as literal class names (not built from a template string) so Tailwind's scanner picks them up.
const LINE_CLAMP_CLASSES: Record<number, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
};

export const TruncatedText: FC<{
  text: string;
  className?: string;
  tooltipClassName?: string;
  positionerClassName?: string;
  /** Number of lines to clamp to before truncating. Defaults to 1 (single-line truncate). */
  lines?: number;
}> = ({ text, className, tooltipClassName, positionerClassName, lines = 1 }) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const isMultiline = lines > 1;

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Measure the inner text span against the stable wrapper.
    // We observe `wrapper` (not the text span) so toggling the Tooltip structure
    // inside doesn't trigger the observer and cause oscillation.
    const check = () => {
      const el = textRef.current;
      if (!el) return;
      setOverflowing(
        isMultiline ? el.scrollHeight > el.clientHeight : el.scrollWidth > el.clientWidth
      );
    };
    check();

    const observer = new ResizeObserver(check);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [text, isMultiline]);

  const content = (
    <span
      ref={textRef}
      className={cn(
        "block",
        isMultiline ? (LINE_CLAMP_CLASSES[lines] ?? LINE_CLAMP_CLASSES[4]) : "truncate",
        !isMultiline && "font-mono text-xs",
        className
      )}
    >
      {text}
    </span>
  );

  return (
    <span ref={wrapperRef} className="block min-w-0 overflow-hidden">
      {overflowing ? (
        <Tooltip>
          <TooltipTrigger className="block w-full">{content}</TooltipTrigger>
          <TooltipContent className={tooltipClassName} positionerClassName={positionerClassName}>
            <p>{text}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        content
      )}
    </span>
  );
};
