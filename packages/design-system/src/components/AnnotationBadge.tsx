import { Badge } from "../atoms/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../atoms/tooltip";
import { FC, useLayoutEffect, useRef, useState } from "react";

interface Props {
  label: string;
}

export const AnnotationBadge: FC<Props> = ({ label }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = spanRef.current;
    if (el) setIsOverflowing(el.scrollWidth > el.clientWidth);
  }, [label]);

  const badge = (
    <Badge variant="secondary" className="max-w-full min-w-0 cursor-default font-mono text-xs">
      <span ref={spanRef} className="block truncate">
        {label}
      </span>
    </Badge>
  );

  if (!isOverflowing) return badge;

  return (
    <Tooltip>
      <TooltipTrigger className="max-w-full min-w-0 text-left">{badge}</TooltipTrigger>
      <TooltipContent>
        <span className="font-mono break-all">{label}</span>
      </TooltipContent>
    </Tooltip>
  );
};
