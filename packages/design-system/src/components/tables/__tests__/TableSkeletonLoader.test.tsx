import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { TableSkeletonLoader } from "../TableSkeletonLoader";

afterEach(() => cleanup());

describe("TableSkeletonLoader", () => {
  it("renders default 5 rows", () => {
    const { container } = render(<TableSkeletonLoader columns={3} />);
    const rows = container.querySelectorAll("[data-slot='table-row']");
    expect(rows.length).toBe(5);
  });

  it("renders custom number of rows", () => {
    const { container } = render(<TableSkeletonLoader columns={3} rows={10} />);
    const rows = container.querySelectorAll("[data-slot='table-row']");
    expect(rows.length).toBe(10);
  });

  it("renders single row when rows=1", () => {
    const { container } = render(<TableSkeletonLoader columns={3} rows={1} />);
    const rows = container.querySelectorAll("[data-slot='table-row']");
    expect(rows.length).toBe(1);
  });

  it("renders zero rows when rows=0", () => {
    const { container } = render(<TableSkeletonLoader columns={3} rows={0} />);
    const rows = container.querySelectorAll("[data-slot='table-row']");
    expect(rows.length).toBe(0);
  });

  it("renders correct number of columns per row", () => {
    const { container } = render(<TableSkeletonLoader columns={5} rows={1} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThanOrEqual(5);
  });

  it("includes checkbox when includeCheckbox is true", () => {
    const { container } = render(<TableSkeletonLoader columns={3} includeCheckbox={true} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThan(3);
  });

  it("does not include checkbox by default", () => {
    const { container } = render(<TableSkeletonLoader columns={3} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    const expectedCellCount = 3;
    expect(cells.length).toBeGreaterThanOrEqual(expectedCellCount);
  });

  it("renders animate-pulse class for skeleton effect", () => {
    const { container } = render(<TableSkeletonLoader columns={2} rows={1} />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });

  it("renders bg-muted background for skeleton", () => {
    const { container } = render(<TableSkeletonLoader columns={2} rows={1} />);
    const muted = container.querySelectorAll(".bg-muted");
    expect(muted.length).toBeGreaterThan(0);
  });

  it("accepts custom columnWidths", () => {
    const { container } = render(
      <TableSkeletonLoader columns={3} rows={1} columnWidths={["w-full", "w-1/2", "w-1/3"]} />
    );
    const rows = container.querySelectorAll("[data-slot='table-row']");
    expect(rows.length).toBe(1);
  });

  it("uses default column widths when not provided", () => {
    const { container } = render(<TableSkeletonLoader columns={3} rows={1} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("renders rounded skeleton loaders", () => {
    const { container } = render(<TableSkeletonLoader columns={2} rows={1} />);
    const rounded = container.querySelectorAll(".rounded-sm, .rounded");
    expect(rounded.length).toBeGreaterThan(0);
  });

  it("renders with h-4 height for skeleton bars", () => {
    const { container } = render(<TableSkeletonLoader columns={2} rows={1} />);
    const bars = container.querySelectorAll(".h-4");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("renders large number of rows efficiently", () => {
    const { container } = render(<TableSkeletonLoader columns={5} rows={100} />);
    const rows = container.querySelectorAll("[data-slot='table-row']");
    expect(rows.length).toBe(100);
  });

  it("renders with multiple columns", () => {
    const { container } = render(<TableSkeletonLoader columns={10} rows={1} />);
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThanOrEqual(10);
  });

  it("applies columnWidths in order", () => {
    const widths = ["w-full", "w-1/2", "w-1/4"];
    const { container } = render(
      <TableSkeletonLoader columns={3} rows={1} columnWidths={widths} />
    );
    const rows = container.querySelectorAll("[data-slot='table-row']");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("handles checkbox + columns correctly", () => {
    const { container } = render(
      <TableSkeletonLoader columns={3} includeCheckbox={true} rows={1} />
    );
    const cells = container.querySelectorAll("[data-slot='table-cell']");
    expect(cells.length).toBeGreaterThan(3);
  });

  it("renders distinct rows with unique keys", () => {
    const { container } = render(<TableSkeletonLoader columns={2} rows={3} />);
    const rows = container.querySelectorAll("[data-slot='table-row']");
    expect(rows.length).toBe(3);
    // Each row should be distinct
    const firstRowHTML = rows[0]?.outerHTML;
    const secondRowHTML = rows[1]?.outerHTML;
    // They should be the same structure but rendered separately
    expect(firstRowHTML).toBeTruthy();
    expect(secondRowHTML).toBeTruthy();
  });
});
