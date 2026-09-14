import { Button, ChevronDownIcon, ChevronUpIcon, Textarea } from "@galacius/design-system";
import { FC, useState } from "react";
import type { ManagedField } from "@galacius/core";

export const ManagedFieldBlock: FC<{ mf: ManagedField }> = ({ mf }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-muted-foreground">
          {mf.Manager}: {mf.Operation}
        </span>
        <Button
          variant="link"
          size="xs"
          className="h-auto w-fit p-0 text-info"
          aria-expanded={show}
          onClick={() => setShow((v) => !v)}
        >
          {show ? "Hide" : "Show"}
          {show ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
        </Button>
      </div>
      {show && mf.FieldsYAML && (
        <Textarea variant="code" disabled value={mf.FieldsYAML.trimEnd()} />
      )}
    </div>
  );
};
