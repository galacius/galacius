import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { Markdown } from "../Markdown";

afterEach(() => cleanup());

describe("Markdown", () => {
  it("renders heading 1", () => {
    const { container } = render(<Markdown># Title</Markdown>);
    const h1 = container.querySelector("h1");
    expect(h1?.textContent).toContain("Title");
  });

  it("renders heading 2", () => {
    const { container } = render(<Markdown>## Subtitle</Markdown>);
    const h2 = container.querySelector("h2");
    expect(h2?.textContent).toContain("Subtitle");
  });

  it("renders paragraphs", () => {
    const { container } = render(<Markdown>This is a paragraph</Markdown>);
    const p = container.querySelector("p");
    expect(p?.textContent).toContain("This is a paragraph");
  });

  it("renders bold text", () => {
    const { container } = render(<Markdown>**bold**</Markdown>);
    const strong = container.querySelector("strong");
    expect(strong?.textContent).toContain("bold");
  });

  it("renders italic text", () => {
    const { container } = render(<Markdown>*italic*</Markdown>);
    const em = container.querySelector("em");
    expect(em?.textContent).toContain("italic");
  });

  it("renders inline code", () => {
    const { container } = render(<Markdown>This is `code`</Markdown>);
    const code = container.querySelector("code");
    expect(code?.textContent).toContain("code");
  });

  it("renders code block", () => {
    const { container } = render(
      <Markdown>
        {`
\`\`\`
const x = 1;
\`\`\`
        `}
      </Markdown>
    );
    const pre = container.querySelector("pre");
    expect(pre).toBeTruthy();
  });

  it("renders unordered list", () => {
    const { container } = render(
      <Markdown>
        {`- Item 1
- Item 2
- Item 3`}
      </Markdown>
    );
    const ul = container.querySelector("ul");
    expect(ul).toBeTruthy();
  });

  it("renders ordered list", () => {
    const { container } = render(
      <Markdown>
        {`1. First
2. Second
3. Third`}
      </Markdown>
    );
    const ol = container.querySelector("ol");
    expect(ol).toBeTruthy();
  });

  it("renders links", () => {
    const { container } = render(<Markdown>[Link](https://example.com)</Markdown>);
    const link = container.querySelector("a");
    expect(link?.href).toContain("example.com");
    expect(link?.target).toBe("_blank");
  });

  it("renders blockquote", () => {
    const { container } = render(<Markdown>{"> A quote"}</Markdown>);
    const blockquote = container.querySelector("blockquote");
    expect(blockquote?.textContent).toContain("A quote");
  });

  it("renders horizontal rule", () => {
    const { container } = render(<Markdown>---</Markdown>);
    const hr = container.querySelector("hr");
    expect(hr).toBeTruthy();
  });

  it("renders images", () => {
    const { container } = render(<Markdown>![alt](https://example.com/image.png)</Markdown>);
    const img = container.querySelector("img");
    expect(img?.src).toContain("example.com/image.png");
  });

  it("strips HTML comments", () => {
    const { container } = render(<Markdown>{"Text<!-- comment -->More text"}</Markdown>);
    expect(container.textContent).not.toContain("comment");
    expect(container.textContent).toContain("TextMore text");
  });

  it("accepts custom className", () => {
    const { container } = render(<Markdown className="custom-class"># Title</Markdown>);
    const wrapper = container.firstChild;
    expect((wrapper as HTMLElement).className).toContain("custom-class");
  });

  it("applies text-foreground to wrapper", () => {
    const { container } = render(<Markdown># Title</Markdown>);
    const wrapper = container.firstChild;
    expect((wrapper as HTMLElement).className).toContain("text-foreground");
  });

  it("renders empty markdown gracefully", () => {
    const { container } = render(<Markdown>{""}</Markdown>);
    expect(container).toBeTruthy();
  });

  it("renders plain text without markdown", () => {
    const { getByText } = render(<Markdown>Just plain text with no special formatting</Markdown>);
    expect(getByText(/plain text/)).toBeTruthy();
  });

  it("renders mixed content", () => {
    const { container } = render(
      <Markdown>
        {`# Title
This is a paragraph.
- List item
**bold** and *italic*`}
      </Markdown>
    );
    const h1 = container.querySelector("h1");
    const p = container.querySelector("p");
    const ul = container.querySelector("ul");
    expect(h1).toBeTruthy();
    expect(p).toBeTruthy();
    expect(ul).toBeTruthy();
  });

  it("renders table (requires remark-gfm)", () => {
    const { container } = render(
      <Markdown>
        {`| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |`}
      </Markdown>
    );
    const table = container.querySelector("table");
    expect(table).toBeTruthy();
  });

  it("renders strikethrough (requires remark-gfm)", () => {
    const { container } = render(<Markdown>~~strikethrough~~</Markdown>);
    const del = container.querySelector("del");
    expect(del?.textContent).toContain("strikethrough");
  });

  it("preserves whitespace in code blocks", () => {
    const { container } = render(
      <Markdown>
        {`
\`\`\`
function test() {
  const x = 1;
  return x;
}
\`\`\`
        `}
      </Markdown>
    );
    const pre = container.querySelector("pre");
    expect(pre?.textContent).toContain("function");
  });

  it("handles malformed markdown gracefully", () => {
    expect(() => {
      render(
        <Markdown>
          {`[unclosed link](https://example.com
**unclosed bold
- list without end`}
        </Markdown>
      );
    }).not.toThrow();
  });

  it("handles very long text", () => {
    const longText = "This is a very long paragraph. ".repeat(100);
    const { container } = render(<Markdown>{longText}</Markdown>);
    expect(container.textContent).toContain("This is a very long");
  });

  it("renders nested formatting", () => {
    const { container } = render(<Markdown>**bold with `code` inside**</Markdown>);
    expect(container.querySelector("strong")).toBeTruthy();
  });

  it("handles special characters in markdown", () => {
    const { container } = render(<Markdown>Text with special chars: &lt; &gt; &amp;</Markdown>);
    expect(container.textContent).toContain("special chars");
  });

  it("renders multiline text correctly", () => {
    const { container } = render(
      <Markdown>
        {`Line 1
Line 2
Line 3`}
      </Markdown>
    );
    expect(container.textContent).toContain("Line 1");
    expect(container.textContent).toContain("Line 2");
    expect(container.textContent).toContain("Line 3");
  });
});
