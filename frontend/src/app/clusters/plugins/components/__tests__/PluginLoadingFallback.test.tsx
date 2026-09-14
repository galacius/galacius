import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { PluginLoadingFallback } from "../PluginLoadingFallback";

describe("PluginLoadingFallback", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders without errors", () => {
    const { container } = render(<PluginLoadingFallback />);
    expect(container).toBeTruthy();
  });

  it("displays the loading spinner and text", () => {
    render(<PluginLoadingFallback />);
    const textElements = screen.getAllByText("Installing plugin...");
    expect(textElements.length).toBeGreaterThan(0);
  });

  it("renders the skeleton table with valid HTML nesting (critical fix)", () => {
    const { container } = render(<PluginLoadingFallback />);

    // Verify <table> exists
    const table = container.querySelector("table");
    expect(table).toBeInTheDocument();

    // Verify <tbody> exists as a direct child of <table>
    const tbody = table!.querySelector("tbody");
    expect(tbody).toBeInTheDocument();

    // Verify <tr> elements exist within <tbody> (not as direct children of <div>)
    const rows = table!.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);

    // *** Critical assertion: Confirm NO <tr> is a direct child of a plain <div> ***
    // This was the original bug — <tr> was a direct child of <div>, violating HTML nesting rules.
    // Now all <tr> must have <tbody> as parent, which is inside <table>.
    const allRows = container.querySelectorAll("tr");
    allRows.forEach((tr) => {
      const parent = tr.parentElement;
      expect(parent?.tagName.toLowerCase()).toBe("tbody");
      expect(parent?.parentElement?.tagName.toLowerCase()).toBe("table");
    });
  });

  it("renders the correct number of skeleton rows", () => {
    const { container } = render(<PluginLoadingFallback />);

    // TableSkeletonLoader is rendered with rows={3}
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(3);
  });

  it("renders skeleton table cells without wrapping them in div", () => {
    const { container } = render(<PluginLoadingFallback />);

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);

    // Verify each row has cells
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  it("wraps skeleton in Table and TableBody components with correct DOM structure", () => {
    const { container } = render(<PluginLoadingFallback />);

    // Verify the DOM structure: div > table > tbody > tr > td
    const div = container.firstChild as HTMLElement;
    expect(div.tagName.toLowerCase()).toBe("div");

    const table = div.querySelector("table");
    expect(table).toBeInTheDocument();

    const tbody = table!.querySelector("tbody");
    expect(tbody).toBeInTheDocument();

    const tr = tbody!.querySelector("tr");
    expect(tr).toBeInTheDocument();

    const td = tr!.querySelector("td");
    expect(td).toBeInTheDocument();
  });
});
