import { cn } from "../../utils/common";
import { FC, JSX } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkdownComponents = Record<string, (props: any) => JSX.Element>;

const markdownComponents: MarkdownComponents = {
  h1: ({ children }) => (
    <h1 className="mt-4 mb-3 text-lg leading-tight font-bold text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3.5 mb-2.5 border-b border-border/50 pb-2 text-base leading-snug font-semibold text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-2 text-sm leading-snug font-semibold text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-2.5 mb-1.5 text-sm leading-snug font-semibold text-foreground">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="mt-2.5 mb-1.5 text-xs leading-snug font-semibold text-foreground">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="mt-2.5 mb-1.5 text-xs leading-snug font-semibold text-muted-foreground">
      {children}
    </h6>
  ),
  p: ({ children }) => <p className="mb-2.5 text-xs leading-relaxed text-foreground">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2.5 list-inside list-disc space-y-1 text-xs leading-relaxed text-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2.5 list-inside list-decimal space-y-1 text-xs leading-relaxed text-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-xs leading-relaxed text-foreground">{children}</li>,
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded border border-border/40 bg-muted/40 p-3">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    const isBlock = !!className;
    if (isBlock) {
      return (
        <code className="block font-mono text-xs leading-relaxed text-foreground">{children}</code>
      );
    }
    return (
      <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-foreground">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-border/40 px-2.5 py-2 text-left text-xs font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border/40 px-2.5 py-2 text-xs text-foreground">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2.5 border-l-4 border-border/60 py-1 pl-3 text-xs text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="cursor-pointer wrap-break-word text-blue-500 underline-offset-1 hover:underline"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt} className="my-2.5 h-auto max-w-full rounded border border-border/40" />
  ),
  hr: () => <hr className="my-3 border-t border-border/40" />,
};

interface MarkdownProps {
  children: string;
  className?: string;
}

export const Markdown: FC<MarkdownProps> = ({ children, className }) => (
  <div className={cn("text-foreground", className)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {children.replace(/<!--[\s\S]*?-->/g, "")}
    </ReactMarkdown>
  </div>
);
