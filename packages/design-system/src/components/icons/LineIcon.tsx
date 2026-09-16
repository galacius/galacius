import { FC } from "react";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "../../atoms/icon";

export const LineIcon: FC<{ isError: boolean; isSpinning: boolean }> = ({
  isError,
  isSpinning,
}) => {
  if (isError) return <XCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />;
  if (isSpinning)
    return <Loader2Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-info" />;
  return <CheckCircle2Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />;
};
