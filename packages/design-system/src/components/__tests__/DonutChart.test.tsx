import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { DonutChart } from "../DonutChart";

afterEach(() => cleanup());

describe("DonutChart", () => {
  it("renders title with total count", () => {
    const { getByText } = render(<DonutChart label="Pods" total={10} running={5} items={[]} />);
    expect(getByText("Pods (10)")).toBeTruthy();
  });

  it("renders svg with correct dimensions", () => {
    const { container } = render(<DonutChart label="Pods" total={10} running={5} items={[]} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("88");
    expect(svg?.getAttribute("height")).toBe("88");
  });

  it("renders background circle", () => {
    const { container } = render(<DonutChart label="Pods" total={10} running={5} items={[]} />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it("renders running circle with correct stroke class", () => {
    const { container } = render(<DonutChart label="Pods" total={10} running={5} items={[]} />);
    const circles = container.querySelectorAll(".stroke-success");
    expect(circles.length).toBeGreaterThan(0);
  });

  it("renders pending circle when pending > 0", () => {
    const { container } = render(
      <DonutChart label="Pods" total={10} running={5} pending={3} items={[]} />
    );
    const circles = container.querySelectorAll(".stroke-warning");
    expect(circles.length).toBeGreaterThan(0);
  });

  it("does not render pending circle when pending is 0 or undefined", () => {
    const { container: container1 } = render(
      <DonutChart label="Pods" total={10} running={5} items={[]} />
    );
    const warnings1 = container1.querySelectorAll(".stroke-warning");

    const { container: container2 } = render(
      <DonutChart label="Pods" total={10} running={5} pending={0} items={[]} />
    );
    const warnings2 = container2.querySelectorAll(".stroke-warning");

    expect(warnings1.length).toBe(0);
    expect(warnings2.length).toBe(0);
  });

  it("renders failed circle when failed > 0", () => {
    const { container } = render(
      <DonutChart label="Pods" total={10} running={5} pending={2} failed={3} items={[]} />
    );
    const circles = container.querySelectorAll(".stroke-destructive");
    expect(circles.length).toBeGreaterThan(0);
  });

  it("does not render failed circle when failed is 0 or undefined", () => {
    const { container: container1 } = render(
      <DonutChart label="Pods" total={10} running={5} items={[]} />
    );
    const destructive1 = container1.querySelectorAll(".stroke-destructive");

    const { container: container2 } = render(
      <DonutChart label="Pods" total={10} running={5} failed={0} items={[]} />
    );
    const destructive2 = container2.querySelectorAll(".stroke-destructive");

    expect(destructive1.length).toBe(0);
    expect(destructive2.length).toBe(0);
  });

  it("renders legend items with positive counts", () => {
    const items = [
      { label: "Running", color: "green" as const, count: 5 },
      { label: "Pending", color: "amber" as const, count: 3 },
    ];
    const { getByText } = render(<DonutChart label="Pods" total={10} running={5} items={items} />);
    expect(getByText("Running: 5")).toBeTruthy();
    expect(getByText("Pending: 3")).toBeTruthy();
  });

  it("does not render legend items with zero count", () => {
    const items = [
      { label: "Running", color: "green" as const, count: 5 },
      { label: "Pending", color: "amber" as const, count: 0 },
      { label: "Failed", color: "red" as const, count: 0 },
    ];
    const { queryByText } = render(
      <DonutChart label="Pods" total={10} running={5} items={items} />
    );
    expect(queryByText("Running: 5")).toBeTruthy();
    expect(queryByText("Pending: 0")).toBeFalsy();
    expect(queryByText("Failed: 0")).toBeFalsy();
  });

  it("applies correct color class for each legend item", () => {
    const items = [
      { label: "Running", color: "green" as const, count: 5 },
      { label: "Pending", color: "amber" as const, count: 3 },
      { label: "Failed", color: "red" as const, count: 2 },
    ];
    const { container } = render(<DonutChart label="Pods" total={10} running={5} items={items} />);
    const badges = container.querySelectorAll("[class*='bg-']");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("calls onNavigate when ResourceLink is clicked", () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <DonutChart label="Pods" total={10} running={5} items={[]} onNavigate={onNavigate} />
    );
    const link = container.querySelector("button");
    link?.click();
    expect(onNavigate).toHaveBeenCalled();
  });

  it("handles zero total gracefully", () => {
    const { getByText } = render(<DonutChart label="Pods" total={0} running={0} items={[]} />);
    expect(getByText("Pods (0)")).toBeTruthy();
  });

  it("calculates correct ratios when total is zero", () => {
    // Should not throw or crash
    const { container } = render(
      <DonutChart label="Pods" total={0} running={0} pending={0} failed={0} items={[]} />
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("handles edge case where running equals total", () => {
    const { container } = render(<DonutChart label="Pods" total={10} running={10} items={[]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders empty items array", () => {
    const { container } = render(<DonutChart label="Pods" total={10} running={5} items={[]} />);
    // Should render without legend items
    const flexCol = container.querySelector(".flex.flex-col.gap-1");
    expect(flexCol).toBeTruthy();
  });

  it("handles multiple legend items efficiently", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      label: `Item ${i}`,
      color: (["green", "amber", "red"] as const)[i % 3],
      count: i + 1,
    }));
    const { getByText } = render(<DonutChart label="Pods" total={55} running={5} items={items} />);
    expect(getByText("Item 0: 1")).toBeTruthy();
    expect(getByText("Item 9: 10")).toBeTruthy();
  });
});
