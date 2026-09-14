import { type VariantProps } from "class-variance-authority";
import * as React from "react";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { SplitAndHighlightText } from "../libs/full-text-search/SplitAndHighlightText";
import { cn } from "../utils/common";
import { Button } from "./button";
import { CheckIcon, CopyIcon } from "./icon";
import { textareaVariants } from "./textarea.variants";

const YC = {
  bg: "#1e1e1e",
  lineNum: "#858585",
  lineNumBorder: "#303030",
  comment: "#6a9955",
  key: "#9cdcfe",
  punct: "#d4d4d4",
  string: "#ce9178",
  bool: "#569cd6",
  number: "#b5cea8",
  default: "#d4d4d4",
} as const;

const BOOLEAN_RE = /^(true|false|yes|no|null|~)$/i;
const NUMBER_RE = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i;

const ScalarValue: React.FC<{
  raw: string;
  searchTerm?: string;
  absoluteStart?: number;
  activeMatchCharIdx?: number;
}> = ({ raw, searchTerm, absoluteStart, activeMatchCharIdx }) => {
  const trimmed = raw.trim();
  const hl = (
    <SplitAndHighlightText
      text={raw}
      term={searchTerm ?? ""}
      absoluteStart={absoluteStart}
      activeMatchCharIdx={activeMatchCharIdx}
    />
  );
  if (!trimmed || /^[|>][+-]?$/.test(trimmed)) return <span style={{ color: YC.punct }}>{hl}</span>;
  if (trimmed.startsWith('"') || trimmed.startsWith("'"))
    return <span style={{ color: YC.string }}>{hl}</span>;
  if (BOOLEAN_RE.test(trimmed)) return <span style={{ color: YC.bool }}>{hl}</span>;
  if (NUMBER_RE.test(trimmed)) return <span style={{ color: YC.number }}>{hl}</span>;
  return <span style={{ color: YC.default }}>{hl}</span>;
};

const YamlValue: React.FC<{
  raw: string;
  searchTerm?: string;
  absoluteStart?: number;
  activeMatchCharIdx?: number;
}> = ({ raw, searchTerm, absoluteStart, activeMatchCharIdx }) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return <span style={{ color: YC.punct }}>{raw}</span>;
  }

  const isQuoted = trimmed.startsWith('"') || trimmed.startsWith("'");
  if (!isQuoted) {
    const commentIdx = raw.search(/\s+#/);
    if (commentIdx !== -1) {
      return (
        <>
          <ScalarValue
            raw={raw.slice(0, commentIdx)}
            searchTerm={searchTerm}
            absoluteStart={absoluteStart}
            activeMatchCharIdx={activeMatchCharIdx}
          />
          <span style={{ color: YC.comment }}>
            <SplitAndHighlightText
              text={raw.slice(commentIdx)}
              term={searchTerm ?? ""}
              absoluteStart={absoluteStart !== undefined ? absoluteStart + commentIdx : undefined}
              activeMatchCharIdx={activeMatchCharIdx}
            />
          </span>
        </>
      );
    }
  }

  return (
    <ScalarValue
      raw={raw}
      searchTerm={searchTerm}
      absoluteStart={absoluteStart}
      activeMatchCharIdx={activeMatchCharIdx}
    />
  );
};

const YamlLine: React.FC<{
  line: string;
  searchTerm?: string;
  lineStart?: number;
  activeMatchCharIdx?: number;
}> = ({ line, searchTerm, lineStart = 0, activeMatchCharIdx }): React.ReactElement => {
  const trimmed = line.trim();
  if (!trimmed) {
    return <span style={{ color: YC.default }}> </span>;
  }

  /** Comment */
  if (trimmed.startsWith("#"))
    return (
      <span style={{ color: YC.comment }}>
        <SplitAndHighlightText
          text={line}
          term={searchTerm ?? ""}
          absoluteStart={lineStart}
          activeMatchCharIdx={activeMatchCharIdx}
        />
      </span>
    );

  /** Key-Value Pair */
  const keyMatch = line.match(/^(\s*)([\w.-]+)(\s*:)(.*)$/);
  if (keyMatch) {
    const [, indent, key, colon, rest] = keyMatch;
    const keyAbsStart = lineStart + indent.length;
    const restAbsStart = keyAbsStart + key.length + colon.length;
    return (
      <span>
        <span style={{ color: YC.default }}>{indent}</span>
        <span style={{ color: YC.key }}>
          <SplitAndHighlightText
            text={key}
            term={searchTerm ?? ""}
            absoluteStart={keyAbsStart}
            activeMatchCharIdx={activeMatchCharIdx}
          />
        </span>
        <span style={{ color: YC.punct }}>{colon}</span>
        <YamlValue
          raw={rest}
          searchTerm={searchTerm}
          absoluteStart={restAbsStart}
          activeMatchCharIdx={activeMatchCharIdx}
        />
      </span>
    );
  }

  /** Array Item */
  const arrayMatch = line.match(/^(\s*-\s?)(.*)$/);
  if (arrayMatch) {
    const [, prefix, rest] = arrayMatch;
    return (
      <span>
        <span style={{ color: YC.punct }}>{prefix}</span>
        <YamlValue
          raw={rest}
          searchTerm={searchTerm}
          absoluteStart={lineStart + prefix.length}
          activeMatchCharIdx={activeMatchCharIdx}
        />
      </span>
    );
  }

  return (
    <span style={{ color: YC.default }}>
      <SplitAndHighlightText
        text={line}
        term={searchTerm ?? ""}
        absoluteStart={lineStart}
        activeMatchCharIdx={activeMatchCharIdx}
      />
    </span>
  );
};

interface TextareaProps
  extends React.ComponentProps<"textarea">, VariantProps<typeof textareaVariants> {
  borderRounded?: boolean;
  searchTerm?: string;
  activeMatchCharIdx?: number;
}

function TextareaYaml({
  className,
  value,
  borderRounded = true,
  editable = false,
  onChange,
  searchTerm,
  activeMatchCharIdx,
  "aria-label": ariaLabel = "YAML editor",
}: Pick<React.ComponentProps<"textarea">, "className" | "value" | "aria-label"> & {
  borderRounded?: boolean;
  editable?: boolean;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  searchTerm?: string;
  activeMatchCharIdx?: number;
}) {
  const text = typeof value === "string" ? value : "";
  const lines = text.split("\n");
  const gutterWidth = `${String(lines.length).length + 2}ch`;

  // Cumulative char offsets: lineStarts[i] = position of lines[i][0] in `text`
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1; // +1 for the \n between lines
  }

  const { copiedValue: isCopied, copy } = useCopyToClipboard();
  const highlightRef = React.useRef<HTMLDivElement>(null);
  const gutterRef = React.useRef<HTMLDivElement>(null);

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  const gutterLines = lines.map((_, i) => (
    <div key={lineStarts[i]} className="leading-5">
      {i + 1}
    </div>
  ));

  const gutterStyle = {
    color: YC.lineNum,
    borderRight: `1px solid ${YC.lineNumBorder}`,
    width: gutterWidth,
    minWidth: gutterWidth,
  };

  const highlightRows = lines.map((line, i) => (
    <div key={lineStarts[i]} className="leading-5 whitespace-pre">
      <YamlLine
        line={line}
        searchTerm={searchTerm}
        lineStart={lineStarts[i]}
        activeMatchCharIdx={activeMatchCharIdx}
      />
    </div>
  ));

  return (
    <div
      className={cn(
        "relative border font-mono text-xs",
        editable && "h-full",
        borderRounded && "rounded-md",
        className
      )}
      style={{ backgroundColor: YC.bg }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1 right-1 z-10"
        onClick={() => copy(text)}
        aria-label="Copy value"
      >
        {isCopied ? (
          <CheckIcon className="h-3.5 w-3.5 text-success" />
        ) : (
          <CopyIcon className="h-3.5 w-3.5" style={{ color: YC.lineNum }} />
        )}
      </Button>

      {editable ? (
        // Edit mode: textarea is the scroll source; gutter + highlight sync via onScroll
        <div className="flex h-full">
          <div
            ref={gutterRef}
            className="overflow-hidden py-1 pr-3 pl-2 text-right font-mono text-xs leading-5 select-none"
            style={gutterStyle}
          >
            {gutterLines}
          </div>
          <div className="relative flex-1 overflow-hidden">
            <div
              ref={highlightRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden py-1 pr-4 pl-4"
            >
              {highlightRows}
            </div>
            <textarea
              value={value}
              onChange={onChange ?? (() => {})}
              onScroll={syncScroll}
              wrap="off"
              data-yaml-editor
              aria-label={ariaLabel}
              className="absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent py-1 pr-4 pl-4 font-mono text-xs leading-5 outline-none"
              style={{ color: "transparent", caretColor: YC.default }}
            />
          </div>
        </div>
      ) : (
        // Read-only mode: outer flex container scrolls everything together
        <div className="flex h-full overflow-auto" data-yaml-scroll>
          <div
            className="py-1 pr-3 pl-2 text-right font-mono text-xs leading-5 select-none"
            style={gutterStyle}
          >
            {gutterLines}
          </div>
          <div className="flex-1 py-1">
            {lines.map((line, i) => (
              <div
                key={lineStarts[i]}
                className="pr-4 pl-4 leading-5 whitespace-pre hover:bg-white/5"
              >
                <YamlLine
                  line={line}
                  searchTerm={searchTerm}
                  lineStart={lineStarts[i]}
                  activeMatchCharIdx={activeMatchCharIdx}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TextareaCode({
  className,
  value,
  disabled,
  borderRounded = true,
  ...props
}: Omit<React.ComponentProps<"textarea">, "variant"> & { borderRounded?: boolean }) {
  const text = typeof value === "string" ? value : "";
  const lines = text.split("\n");
  const { copiedValue: isCopied, copy } = useCopyToClipboard();

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden border border-zinc-800 bg-zinc-950",
        borderRounded && "rounded-md",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1 right-1 z-10"
        onClick={() => copy(text)}
        aria-label="Copy value"
      >
        {isCopied ? (
          <CheckIcon className="h-3.5 w-3.5 text-success" />
        ) : (
          <CopyIcon className="h-3.5 w-3.5" />
        )}
      </Button>
      <div className="flex">
        <div className="border-r border-zinc-800 py-2 select-none">
          {lines.map((line, i) => (
            <div
              key={`${i}-${line}`}
              className="w-10 min-w-10 bg-zinc-950 pr-3 text-right font-mono text-xs leading-5 text-zinc-600"
            >
              {i + 1}
            </div>
          ))}
        </div>

        {disabled ? (
          <div className="min-w-0 flex-1 overflow-x-auto">
            <pre className="flex flex-col py-2">
              {lines.map((line, i) => (
                <span key={`${i}-${line}`} className="flex">
                  <span className="pl-3 font-mono text-xs leading-5 whitespace-pre text-zinc-200">
                    {line || " "}
                  </span>
                </span>
              ))}
            </pre>
          </div>
        ) : (
          <textarea
            value={value}
            rows={lines.length}
            wrap="off"
            className={cn(textareaVariants({ variant: "code" }))}
            {...props}
          />
        )}
      </div>
    </div>
  );
}

function Textarea({
  className,
  variant = "default",
  state = "default",
  value,
  borderRounded = true,
  searchTerm,
  activeMatchCharIdx,
  editable,
  onChange,
  "aria-label": ariaLabel,
  ...props
}: TextareaProps & {
  editable?: boolean;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}) {
  if (variant === "code") {
    return (
      <TextareaCode
        className={className}
        value={value}
        borderRounded={borderRounded}
        aria-label={ariaLabel}
        {...props}
      />
    );
  }

  if (variant === "yaml") {
    return (
      <TextareaYaml
        className={className}
        value={value}
        borderRounded={borderRounded}
        editable={editable}
        onChange={onChange}
        searchTerm={searchTerm}
        activeMatchCharIdx={activeMatchCharIdx}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <textarea
      value={value}
      aria-label={ariaLabel}
      className={cn(
        textareaVariants({ variant, state }),
        !borderRounded && "rounded-none",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
export type { TextareaProps };
