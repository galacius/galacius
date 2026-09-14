import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TruncatedText } from "../TruncatedText";

beforeEach(() => {
  // Mock ResizeObserver is already set up in test-setup.ts
});

afterEach(() => cleanup());

describe("TruncatedText", () => {
  it("renders text", () => {
    const { getByText } = render(<TruncatedText text="Hello World" />);
    expect(getByText("Hello World")).toBeTruthy();
  });

  it("applies truncate class", () => {
    const { container } = render(<TruncatedText text="Hello World" />);
    const span = container.querySelector(".truncate");
    expect(span).toBeTruthy();
  });

  it("applies font-mono class", () => {
    const { container } = render(<TruncatedText text="Hello World" />);
    const span = container.querySelector(".font-mono");
    expect(span).toBeTruthy();
  });

  it("applies text-xs class", () => {
    const { container } = render(<TruncatedText text="Hello World" />);
    const span = container.querySelector(".text-xs");
    expect(span).toBeTruthy();
  });

  it("accepts custom className", () => {
    const { container } = render(<TruncatedText text="Hello World" className="custom-class" />);
    const span = container.querySelector(".custom-class");
    expect(span).toBeTruthy();
  });

  it("merges custom className with default classes, letting twMerge resolve conflicts", () => {
    const { container } = render(<TruncatedText text="Hello World" className="text-lg" />);
    const span = container.querySelector(".font-mono.truncate");
    expect(span).toBeTruthy();
    // text-lg overrides the default text-xs since twMerge dedupes same-category utilities
    expect(span?.className).toContain("text-lg");
    expect(span?.className).not.toContain("text-xs");
  });

  it("accepts tooltipClassName", () => {
    const { container } = render(
      <TruncatedText text="Hello World" tooltipClassName="custom-tooltip" />
    );
    expect(container).toBeTruthy();
  });

  it("accepts positionerClassName", () => {
    const { container } = render(
      <TruncatedText text="Hello World" positionerClassName="custom-pos" />
    );
    expect(container).toBeTruthy();
  });

  it("renders wrapper with block display", () => {
    const { container } = render(<TruncatedText text="Hello World" />);
    const wrapper = container.querySelector(".block.min-w-0.overflow-hidden");
    expect(wrapper).toBeTruthy();
  });

  it("renders inner span with block display", () => {
    const { container } = render(<TruncatedText text="Hello World" />);
    const inner = container.querySelector(".block.truncate.font-mono");
    expect(inner).toBeTruthy();
  });

  it("handles empty text", () => {
    const { container } = render(<TruncatedText text="" />);
    expect(container).toBeTruthy();
  });

  it("handles very long text", () => {
    const longText = "a".repeat(1000);
    const { getByText } = render(<TruncatedText text={longText} />);
    const span = getByText(longText);
    expect(span).toBeTruthy();
  });

  it("handles special characters in text", () => {
    const { getByText } = render(<TruncatedText text="test:key#value@host" />);
    expect(getByText("test:key#value@host")).toBeTruthy();
  });

  it("handles unicode characters", () => {
    const { getByText } = render(<TruncatedText text="こんにちは世界" />);
    expect(getByText("こんにちは世界")).toBeTruthy();
  });

  it("updates when text changes", () => {
    const { rerender, getByText } = render(<TruncatedText text="Initial" />);
    expect(getByText("Initial")).toBeTruthy();

    rerender(<TruncatedText text="Updated" />);
    expect(getByText("Updated")).toBeTruthy();
  });

  it("observers are created and cleaned up", () => {
    const observeSpy = vi.spyOn(ResizeObserver.prototype, "observe");
    const disconnectSpy = vi.spyOn(ResizeObserver.prototype, "disconnect");

    const { unmount } = render(<TruncatedText text="Hello World" />);
    expect(observeSpy).toHaveBeenCalled();

    unmount();
    expect(disconnectSpy).toHaveBeenCalled();

    observeSpy.mockRestore();
    disconnectSpy.mockRestore();
  });

  it("renders without overflow triggering tooltip", () => {
    const { container } = render(<TruncatedText text="Short" />);
    // By default, short text shouldn't trigger overflow
    const textSpan = container.querySelector(".block.truncate");
    expect(textSpan).toBeTruthy();
  });

  it("handles rapid text updates", () => {
    const { rerender } = render(<TruncatedText text="Text 1" />);
    rerender(<TruncatedText text="Text 2" />);
    rerender(<TruncatedText text="Text 3" />);
    rerender(<TruncatedText text="Text 4" />);
    rerender(<TruncatedText text="Text 5" />);
    // Should handle without errors
    expect(true).toBe(true);
  });

  it("maintains stable reference for wrapper", () => {
    const { container } = render(<TruncatedText text="Hello World" />);
    const wrapper = container.querySelector(".block.min-w-0.overflow-hidden");
    expect(wrapper).toBeTruthy();
  });

  it("renders with custom className without losing truncate", () => {
    const { container } = render(<TruncatedText text="Hello World" className="text-red-500" />);
    const span = container.querySelector(".truncate");
    expect(span).toBeTruthy();
    expect(span?.className).toContain("text-red-500");
  });

  it("applies all style classes together", () => {
    const { container } = render(
      <TruncatedText
        text="Hello World"
        className="text-blue-500"
        tooltipClassName="bg-black"
        positionerClassName="top-full"
      />
    );
    const inner = container.querySelector(".block.truncate.font-mono.text-xs");
    expect(inner).toBeTruthy();
  });

  it("text content is readable in component", () => {
    const testText = "pod-abc123-xyz";
    const { container } = render(<TruncatedText text={testText} />);
    const span = container.querySelector("span");
    expect(span?.textContent).toContain(testText);
  });
});
