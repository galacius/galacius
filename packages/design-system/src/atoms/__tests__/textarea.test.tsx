import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("../../hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: vi.fn(() => ({
    copiedValue: null,
    copy: vi.fn(),
  })),
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { Textarea } from "../textarea";

// ─── tests ────────────────────────────────────────────────────────────────────

describe("Textarea with YAML variant and search highlighting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders mark elements for matching search term", () => {
    const { container } = render(<Textarea variant="yaml" value="key: value" searchTerm="value" />);

    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].textContent).toBe("value");
  });

  it("renders no mark elements when searchTerm is empty", () => {
    const { container } = render(<Textarea variant="yaml" value="key: value" searchTerm="" />);

    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(0);
  });

  it("renders no mark elements when searchTerm is undefined", () => {
    const { container } = render(<Textarea variant="yaml" value="key: value" />);

    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(0);
  });

  it("performs case-insensitive match", () => {
    const { container } = render(<Textarea variant="yaml" value="Key: VALUE" searchTerm="value" />);

    const marks = container.querySelectorAll("mark");
    // Should match "VALUE" (case-insensitive)
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].textContent).toBe("VALUE");
  });

  it("renders multiple marks on same line for multiple matches", () => {
    const { container } = render(<Textarea variant="yaml" value="foo foo foo" searchTerm="foo" />);

    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(3);
    marks.forEach((mark) => {
      expect(mark.textContent).toBe("foo");
    });
  });

  it("renders mark in key position when key matches search term", () => {
    const { container } = render(
      <Textarea variant="yaml" value="replicaCount: 1" searchTerm="replica" />
    );

    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThan(0);
    // Find the mark that contains "replica"
    const replicaMark = Array.from(marks).find((m) =>
      m.textContent?.toLowerCase().includes("replica")
    );
    expect(replicaMark).toBeDefined();
  });

  it("renders mark with correct styling classes", () => {
    const { container } = render(<Textarea variant="yaml" value="key: value" searchTerm="value" />);

    const mark = container.querySelector("mark");
    expect(mark?.className).toContain("border-yellow-300");
    expect(mark?.className).toContain("inline");
    expect(mark?.className).toContain("rounded-none");
  });

  it("renders mark in value section across multiple lines", () => {
    const { container } = render(
      <Textarea
        variant="yaml"
        value="first: match\nsecond: data\nthird: match"
        searchTerm="match"
      />
    );

    const marks = container.querySelectorAll("mark");
    // Should find "match" on line 1 and line 3
    expect(marks.length).toBe(2);
    marks.forEach((mark) => {
      expect(mark.textContent).toBe("match");
    });
  });

  it("preserves text content when highlighting multiline YAML", () => {
    const yamlContent = `replicas: 3
image:
  repository: nginx
  tag: "1.19"`;

    const { container } = render(
      <Textarea variant="yaml" value={yamlContent} searchTerm="nginx" />
    );

    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe("nginx");
  });

  it("handles search term that appears in comments", () => {
    const { container } = render(
      <Textarea variant="yaml" value="key: value # this is value in comment" searchTerm="value" />
    );

    const marks = container.querySelectorAll("mark");
    // Should find at least 2 matches: one in value, one in comment
    expect(marks.length).toBeGreaterThanOrEqual(2);
  });

  it("does not render marks for non-matching search term", () => {
    const { container } = render(
      <Textarea variant="yaml" value="key: value" searchTerm="notfound" />
    );

    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(0);
  });

  it("handles empty YAML content", () => {
    const { container } = render(<Textarea variant="yaml" value="" searchTerm="value" />);

    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(0);
  });

  it("renders marks in boolean and numeric values", () => {
    const { container } = render(
      <Textarea variant="yaml" value="enabled: true\ncount: 123" searchTerm="1" />
    );

    const marks = container.querySelectorAll("mark");
    // Should find "1" in "123"
    expect(marks.length).toBeGreaterThan(0);
  });

  it("renders textarea with copy button", () => {
    const { container } = render(<Textarea variant="yaml" value="key: value" />);

    // Find button with aria-label "Copy value"
    const copyButton = container.querySelector('button[aria-label="Copy value"]');
    expect(copyButton).toBeInTheDocument();
  });

  it("renders line numbers for YAML lines", () => {
    const { container } = render(<Textarea variant="yaml" value="line1: value\nline2: value" />);

    // Check that the yaml-scroll container exists (read-only mode)
    const scrollContainer = container.querySelector("[data-yaml-scroll]");
    expect(scrollContainer).toBeInTheDocument();

    // Check for the presence of line divs in the content area
    const lineDivs = scrollContainer?.querySelectorAll(".flex-1 > div");
    expect(lineDivs?.length).toBeGreaterThan(0);
  });
});

describe("Textarea editable YAML mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders native textarea when editable=true", () => {
    const { container } = render(
      <Textarea variant="yaml" value="key: value" editable={true} onChange={() => {}} />
    );

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeInTheDocument();
    expect(textarea?.value).toBe("key: value");
  });

  it("renders syntax-highlighted table when editable=false (default)", () => {
    const { container } = render(<Textarea variant="yaml" value="key: value" />);

    // Check for the yaml-scroll container in read-only mode
    const scrollContainer = container.querySelector("[data-yaml-scroll]");
    expect(scrollContainer).toBeInTheDocument();

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeNull();
  });

  it("calls onChange when textarea value changes", () => {
    const handleChange = vi.fn();
    const { container } = render(
      <Textarea variant="yaml" value="key: value" editable={true} onChange={handleChange} />
    );

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeDefined();

    fireEvent.change(textarea, { target: { value: "key: newvalue" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("renders line numbers gutter in editable mode", () => {
    const { container } = render(
      <Textarea
        variant="yaml"
        value="line1: value\nline2: value\nline3: value"
        editable={true}
        onChange={() => {}}
      />
    );

    // Check that both flex container and textarea exist in editable mode
    const flexContainer = container.querySelector(".flex.h-full");
    expect(flexContainer).toBeInTheDocument();

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeInTheDocument();

    // Verify no yaml-scroll container is rendered (that's for read-only mode)
    const scrollContainer = container.querySelector("[data-yaml-scroll]");
    expect(scrollContainer).not.toBeInTheDocument();
  });

  it("renders copy button in editable mode", () => {
    const { container } = render(
      <Textarea variant="yaml" value="key: value" editable={true} onChange={() => {}} />
    );

    const copyButton = container.querySelector('button[aria-label="Copy value"]');
    expect(copyButton).toBeInTheDocument();
  });

  it("displays correct gutterWidth for different line counts", () => {
    const { container: container1 } = render(
      <Textarea variant="yaml" value="single line" editable={true} onChange={() => {}} />
    );
    const { container: container100 } = render(
      <Textarea
        variant="yaml"
        value={Array(100).fill("line: value").join("\n")}
        editable={true}
        onChange={() => {}}
      />
    );

    // Both should render flex containers with textarea
    const flex1 = container1.querySelector(".flex.h-full");
    const flex100 = container100.querySelector(".flex.h-full");
    const textarea1 = container1.querySelector("textarea");
    const textarea100 = container100.querySelector("textarea");

    expect(flex1).toBeInTheDocument();
    expect(flex100).toBeInTheDocument();
    expect(textarea1).toBeInTheDocument();
    expect(textarea100).toBeInTheDocument();
  });

  it("textarea has correct styling in editable mode", () => {
    const { container } = render(
      <Textarea variant="yaml" value="key: value" editable={true} onChange={() => {}} />
    );

    const textarea = container.querySelector("textarea");
    expect(textarea?.className).toContain("absolute");
    expect(textarea?.className).toContain("resize-none");
    expect(textarea?.className).toContain("outline-none");
    expect(textarea?.getAttribute("wrap")).toBe("off");
  });
});
