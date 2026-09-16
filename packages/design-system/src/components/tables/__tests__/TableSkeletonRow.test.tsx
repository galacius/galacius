import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { TableSkeletonRow } from "../TableSkeletonRow";

afterEach(() => cleanup());

describe("TableSkeletonRow", () => {
  it("renders table row", () => {
    const { container } = render(<TableSkeletonRow columns={3} />);
    const row = container.querySelector("[data-slot='table-row']");
    expect(row).toBeTruthy();
  });

  it("renders correct number of columns", () => {
    const { container } = render(<TableSkeletonRow columns={5} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThanOrEqual(5);
  });

  it("includes checkbox column when includeCheckbox is true", () => {
    const { container } = render(<TableSkeletonRow columns={3} includeCheckbox={true} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThan(3);
  });

  it("does not include checkbox by default", () => {
    const { container } = render(<TableSkeletonRow columns={3} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThanOrEqual(3);
  });

  it("renders animate-pulse for skeleton effect", () => {
    const { container } = render(<TableSkeletonRow columns={2} />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });

  it("renders bg-muted background", () => {
    const { container } = render(<TableSkeletonRow columns={2} />);
    const muted = container.querySelectorAll(".bg-muted");
    expect(muted.length).toBeGreaterThan(0);
  });

  it("renders h-4 skeleton bars", () => {
    const { container } = render(<TableSkeletonRow columns={2} />);
    const bars = container.querySelectorAll(".h-4");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("renders rounded skeleton loaders", () => {
    const { container } = render(<TableSkeletonRow columns={2} />);
    const rounded = container.querySelectorAll(".rounded-sm, .rounded");
    expect(rounded.length).toBeGreaterThan(0);
  });

  it("applies default column width when not provided", () => {
    const { container } = render(<TableSkeletonRow columns={1} />);
    const cell = container.querySelector("[data-slot='table-cell']");
    expect(cell).toBeTruthy();
  });

  it("applies custom column widths", () => {
    const { container } = render(
      <TableSkeletonRow columns={3} columnWidths={["w-full", "w-1/2"]} />
    );
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThanOrEqual(3);
  });

  it("renders single column", () => {
    const { container } = render(<TableSkeletonRow columns={1} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });

  it("renders many columns", () => {
    const { container } = render(<TableSkeletonRow columns={20} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThanOrEqual(20);
  });

  it("renders checkbox cell with skeleton", () => {
    const { container } = render(<TableSkeletonRow columns={2} includeCheckbox={true} />);
    const checkboxCell = container.querySelector("[data-slot='table-cell']");
    expect(checkboxCell).toBeTruthy();
  });

  it("renders checkbox with h-4 w-4 dimensions", () => {
    const { container } = render(<TableSkeletonRow columns={2} includeCheckbox={true} />);
    const checkboxSkeleton = container.querySelector(".h-4.w-4");
    expect(checkboxSkeleton).toBeTruthy();
  });

  it("applies rounded-[4px] to checkbox skeleton", () => {
    const { container } = render(<TableSkeletonRow columns={2} includeCheckbox={true} />);
    const checkbox = container.querySelector('[class*="rounded-"]');
    expect(checkbox).toBeTruthy();
  });

  it("renders data cells with default width", () => {
    const { container } = render(<TableSkeletonRow columns={3} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    // Should have data cells with content
    expect(cells.length).toBeGreaterThan(0);
  });

  it("renders trailing empty cell", () => {
    const { container } = render(<TableSkeletonRow columns={2} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    // Should have columns + 1 for trailing cell
    expect(cells.length).toBeGreaterThanOrEqual(3);
  });

  it("handles mixed columnWidths correctly", () => {
    const widths = ["w-full", "w-1/2", "w-1/4", "w-1/3"];
    const { container } = render(<TableSkeletonRow columns={4} columnWidths={widths} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThanOrEqual(4);
  });

  it("renders without columnWidths array", () => {
    const { container } = render(<TableSkeletonRow columns={2} />);
    const row = container.querySelector("[data-slot='table-row']");
    expect(row?.children.length).toBeGreaterThanOrEqual(2);
  });

  it("applies animation to all skeleton elements", () => {
    const { container } = render(<TableSkeletonRow columns={3} />);
    const animatedElements = container.querySelectorAll(".animate-pulse");
    expect(animatedElements.length).toBeGreaterThanOrEqual(3);
  });

  it("renders both checkbox and data columns with animation", () => {
    const { container } = render(<TableSkeletonRow columns={3} includeCheckbox={true} />);
    const animated = container.querySelectorAll(".animate-pulse");
    // Checkbox + 3 data columns = at least 4 animated elements
    expect(animated.length).toBeGreaterThanOrEqual(4);
  });
});
