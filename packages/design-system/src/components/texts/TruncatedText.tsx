import { Tooltip, TooltipContent, TooltipTrigger } from "../../atoms/tooltip";
import { cn } from "../../utils/common";
import { FC, useLayoutEffect, useRef, useState } from "react";

export const TruncatedText: FC<{
  text: string;
  className?: string;
  tooltipClassName?: string;
  positionerClassName?: string;
}> = ({ text, className, tooltipClassName, positionerClassName }) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Measure the inner text span against the stable wrapper.
    // We observe `wrapper` (not the text span) so toggling the Tooltip structure
    // inside doesn't trigger the observer and cause oscillation.
    const check = () => {
      const el = textRef.current;
      if (el) setOverflowing(el.scrollWidth > el.clientWidth);
    };
    check();

    const observer = new ResizeObserver(check);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [text]);

  const content = (
    <span ref={textRef} className={cn("block truncate font-mono text-xs", className)}>
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
