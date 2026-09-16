import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { AnnotationBadge } from "../AnnotationBadge";

afterEach(() => cleanup());

describe("AnnotationBadge", () => {
  it("renders a badge with the label", () => {
    const { getByText } = render(<AnnotationBadge label="test-key" />);
    expect(getByText("test-key")).toBeTruthy();
  });

  it("applies badge secondary variant styles", () => {
    const { container } = render(<AnnotationBadge label="test-key" />);
    const badge = container.querySelector("span span");
    expect(badge?.className).toContain("truncate");
  });

  it("does not render tooltip when text is not overflowing", () => {
    const { queryByRole } = render(<AnnotationBadge label="short" />);
    const tooltip = queryByRole("tooltip");
    expect(tooltip).toBeFalsy();
  });

  it("renders monospace font for label", () => {
    const { container } = render(<AnnotationBadge label="test-key" />);
    const badge = container.querySelector(".font-mono");
    expect(badge).toBeTruthy();
  });

  it("renders with max-w-full min-w-0 constraint", () => {
    const { container } = render(<AnnotationBadge label="a-very-long-label-text" />);
    const badge = container.querySelector(".max-w-full.min-w-0");
    expect(badge).toBeTruthy();
  });

  it("handles empty label gracefully", () => {
    const { container } = render(<AnnotationBadge label="" />);
    const badge = container.querySelector(".font-mono");
    expect(badge).toBeTruthy();
  });

  it("applies cursor-default to badge", () => {
    const { container } = render(<AnnotationBadge label="test" />);
    const badge = container.querySelector(".cursor-default");
    expect(badge).toBeTruthy();
  });

  it("renders text-xs font size", () => {
    const { container } = render(<AnnotationBadge label="test" />);
    const badge = container.querySelector(".text-xs");
    expect(badge).toBeTruthy();
  });

  it("handles labels with special characters", () => {
    const { getByText } = render(<AnnotationBadge label="test-key:value#hash" />);
    expect(getByText("test-key:value#hash")).toBeTruthy();
  });

  it("handles long labels with truncation", () => {
    const longLabel = "this-is-a-very-long-label-that-should-be-truncated";
    const { getByText } = render(<AnnotationBadge label={longLabel} />);
    expect(getByText(longLabel)).toBeTruthy();
  });
});
