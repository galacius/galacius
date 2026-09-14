import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ResourceCell } from "../resources/ResourceCell";

afterEach(() => cleanup());

describe("ResourceCell", () => {
  it("renders label text", () => {
    const { getByText } = render(<ResourceCell label="Memory" percent={50} />);
    expect(getByText("Memory")).toBeTruthy();
  });

  it("renders background bar", () => {
    const { container } = render(<ResourceCell label="Memory" percent={50} />);
    const bar = container.querySelector(".bg-muted");
    expect(bar).toBeTruthy();
  });

  it("renders progress bar when percent > 0", () => {
    const { container } = render(<ResourceCell label="Memory" percent={50} />);
    const progress = container.querySelector(".h-full.rounded-full");
    expect(progress).toBeTruthy();
  });

  it("does not render progress bar when percent is 0", () => {
    const { container } = render(<ResourceCell label="Memory" percent={0} />);
    const progress = container.querySelector("[style*='width: 0%']");
    expect(progress).toBeFalsy();
  });

  it("applies success color for percent <= 50", () => {
    const { container } = render(<ResourceCell label="Memory" percent={30} />);
    const progress = container.querySelector(".bg-success");
    expect(progress).toBeTruthy();
  });

  it("applies success color for exactly 50 percent", () => {
    const { container } = render(<ResourceCell label="Memory" percent={50} />);
    const progress = container.querySelector(".bg-success");
    expect(progress).toBeTruthy();
  });

  it("applies warning color for percent between 50 and 80", () => {
    const { container } = render(<ResourceCell label="Memory" percent={75} />);
    const progress = container.querySelector(".bg-warning");
    expect(progress).toBeTruthy();
  });

  it("applies warning color for exactly 80 percent", () => {
    const { container } = render(<ResourceCell label="Memory" percent={80} />);
    const progress = container.querySelector(".bg-warning");
    expect(progress).toBeTruthy();
  });

  it("applies destructive color for percent > 80", () => {
    const { container } = render(<ResourceCell label="Memory" percent={90} />);
    const progress = container.querySelector(".bg-destructive");
    expect(progress).toBeTruthy();
  });

  it("applies destructive color for exactly 81 percent", () => {
    const { container } = render(<ResourceCell label="Memory" percent={81} />);
    const progress = container.querySelector(".bg-destructive");
    expect(progress).toBeTruthy();
  });

  it("clamps percent to 100", () => {
    const { container } = render(<ResourceCell label="Memory" percent={150} />);
    const progress = container.querySelector("[style*='width:']") as HTMLElement;
    const widthMatch = progress?.style.width;
    expect(widthMatch).toBe("100%");
  });

  it("handles negative percent by showing no bar", () => {
    const { container } = render(<ResourceCell label="Memory" percent={-10} />);
    const bar = container.querySelector(".bg-success, .bg-warning, .bg-destructive");
    // Negative percent results in no colored progress
    expect(bar).toBeFalsy();
  });

  it("sets correct width percentage on progress bar", () => {
    const { container } = render(<ResourceCell label="Memory" percent={65} />);
    const progress = container.querySelector("[style*='width:']") as HTMLElement;
    expect(progress?.style.width).toBe("65%");
  });

  it("renders with min-w-36 for minimum width", () => {
    const { container } = render(<ResourceCell label="Memory" percent={50} />);
    const wrapper = container.querySelector(".min-w-36");
    expect(wrapper).toBeTruthy();
  });

  it("applies transition-interactive to progress bar", () => {
    const { container } = render(<ResourceCell label="Memory" percent={50} />);
    const progress = container.querySelector(".transition-interactive");
    expect(progress).toBeTruthy();
  });

  it("applies rounded-full to progress bar", () => {
    const { container } = render(<ResourceCell label="Memory" percent={50} />);
    const progress = container.querySelector(".rounded-full");
    expect(progress).toBeTruthy();
  });

  it("renders label with muted-foreground color", () => {
    const { container } = render(<ResourceCell label="Memory" percent={50} />);
    const label = container.querySelector(".text-muted-foreground");
    expect(label).toBeTruthy();
  });

  it("renders label with text-xs size", () => {
    const { container } = render(<ResourceCell label="Memory" percent={50} />);
    const label = container.querySelector(".text-xs");
    expect(label).toBeTruthy();
  });

  it("renders as flex column with gap-1", () => {
    const { container } = render(<ResourceCell label="Memory" percent={50} />);
    const wrapper = container.querySelector(".flex.flex-col.gap-1");
    expect(wrapper).toBeTruthy();
  });

  it("handles decimal percentages", () => {
    const { container } = render(<ResourceCell label="Memory" percent={45.5} />);
    const progress = container.querySelector("[style*='width:']") as HTMLElement;
    expect(progress?.style.width).toBe("45.5%");
  });

  it("renders different labels", () => {
    const { container: c1 } = render(<ResourceCell label="CPU" percent={30} />);
    expect(c1.textContent).toContain("CPU");

    const { container: c2 } = render(<ResourceCell label="Memory" percent={60} />);
    expect(c2.textContent).toContain("Memory");

    const { container: c3 } = render(<ResourceCell label="Disk" percent={80} />);
    expect(c3.textContent).toContain("Disk");
  });

  it("handles very small percentages", () => {
    const { container } = render(<ResourceCell label="Memory" percent={1} />);
    const progress = container.querySelector("[style*='width:']") as HTMLElement;
    expect(progress?.style.width).toBe("1%");
  });

  it("renders correct structure for empty label", () => {
    const { container } = render(<ResourceCell label="" percent={50} />);
    const wrapper = container.querySelector(".flex.flex-col.gap-1");
    expect(wrapper).toBeTruthy();
  });
});
