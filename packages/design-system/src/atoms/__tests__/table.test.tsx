import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "../table";

describe("Table component", () => {
  describe("Table wrapper", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      const table = container.querySelector("[data-slot='table']");
      expect(table).toBeTruthy();
      expect(table?.getAttribute("data-slot")).toBe("table");
    });

    it("wraps table in container with data-slot", () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      const tableContainer = container.querySelector("[data-slot='table-container']");
      expect(tableContainer).toBeTruthy();
    });

    it("applies base table styling", () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      const table = container.querySelector("[data-slot='table']");
      expect(table?.className).toContain("w-full");
      expect(table?.className).toContain("caption-bottom");
      expect(table?.className).toContain("text-sm");
    });

    it("applies container styling for overflow", () => {
      const { container } = render(
        <Table>
          <TableBody />
        </Table>
      );
      const tableContainer = container.querySelector("[data-slot='table-container']");
      expect(tableContainer?.className).toContain("overflow-x-auto");
    });

    it("accepts custom className on table", () => {
      const { container } = render(
        <Table className="custom-table">
          <TableBody />
        </Table>
      );
      const table = container.querySelector("[data-slot='table']");
      expect(table?.className).toContain("custom-table");
      expect(table?.className).toContain("w-full");
    });

    it("accepts containerClassName", () => {
      const { container } = render(
        <Table containerClassName="custom-container">
          <TableBody />
        </Table>
      );
      const tableContainer = container.querySelector("[data-slot='table-container']");
      expect(tableContainer?.className).toContain("custom-container");
    });
  });

  describe("TableHeader", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      const header = container.querySelector("[data-slot='table-header']");
      expect(header).toBeTruthy();
      expect(header?.getAttribute("data-slot")).toBe("table-header");
    });

    it("applies border-bottom styling to rows", () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      const header = container.querySelector("[data-slot='table-header']");
      expect(header?.className).toContain("[&_tr]:border-b");
    });
  });

  describe("TableBody", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const body = container.querySelector("[data-slot='table-body']");
      expect(body).toBeTruthy();
      expect(body?.getAttribute("data-slot")).toBe("table-body");
    });

    it("applies no border to last row", () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const body = container.querySelector("[data-slot='table-body']");
      expect(body?.className).toContain("[&_tr:last-child]:border-0");
    });
  });

  describe("TableFooter", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Table>
          <TableFooter>
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );
      const footer = container.querySelector("[data-slot='table-footer']");
      expect(footer).toBeTruthy();
      expect(footer?.getAttribute("data-slot")).toBe("table-footer");
    });

    it("applies muted background styling", () => {
      const { container } = render(
        <Table>
          <TableFooter>
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );
      const footer = container.querySelector("[data-slot='table-footer']");
      expect(footer?.className).toContain("bg-muted/50");
      expect(footer?.className).toContain("border-t");
    });
  });

  describe("TableRow", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const row = container.querySelector("[data-slot='table-row']");
      expect(row).toBeTruthy();
      expect(row?.getAttribute("data-slot")).toBe("table-row");
    });

    it("applies hover styling", () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const row = container.querySelector("[data-slot='table-row']");
      expect(row?.className).toContain("hover:bg-muted/50");
    });

    it("applies cursor-pointer when onClick provided", () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow onClick={() => {}}>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const row = container.querySelector("[data-slot='table-row']");
      expect(row?.className).toContain("cursor-pointer");
    });

    it("applies selected state styling", () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow data-state="selected">
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const row = container.querySelector("[data-slot='table-row']");
      expect(row?.className).toContain("data-[state=selected]:bg-muted");
    });
  });

  describe("TableHead", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      const head = container.querySelector("[data-slot='table-head']");
      expect(head).toBeTruthy();
      expect(head?.getAttribute("data-slot")).toBe("table-head");
    });

    it("applies heading styling", () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      const head = container.querySelector("[data-slot='table-head']");
      expect(head?.className).toContain("h-10");
      expect(head?.className).toContain("font-medium");
      expect(head?.className).toContain("text-left");
    });
  });

  describe("TableCell", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const cell = container.querySelector("[data-slot='table-cell']");
      expect(cell).toBeTruthy();
      expect(cell?.getAttribute("data-slot")).toBe("table-cell");
    });

    it("applies cell styling", () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const cell = container.querySelector("[data-slot='table-cell']");
      expect(cell?.className).toContain("p-2");
      expect(cell?.className).toContain("text-left");
      expect(cell?.className).toContain("whitespace-nowrap");
    });
  });

  describe("TableCaption", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Table>
          <TableCaption>Caption text</TableCaption>
        </Table>
      );
      const caption = container.querySelector("[data-slot='table-caption']");
      expect(caption).toBeTruthy();
      expect(caption?.getAttribute("data-slot")).toBe("table-caption");
    });

    it("applies caption styling", () => {
      const { container } = render(
        <Table>
          <TableCaption>Caption text</TableCaption>
        </Table>
      );
      const caption = container.querySelector("[data-slot='table-caption']");
      expect(caption?.className).toContain("mt-4");
      expect(caption?.className).toContain("text-muted-foreground");
    });

    it("renders caption text", () => {
      const { container } = render(
        <Table>
          <TableCaption>This is a table caption</TableCaption>
        </Table>
      );
      expect(container.textContent).toContain("This is a table caption");
    });
  });

  describe("integration", () => {
    it("renders complete table structure", () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Col 1</TableHead>
              <TableHead>Col 2</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Data 1</TableCell>
              <TableCell>Data 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(container.querySelector("[data-slot='table']")).toBeTruthy();
      expect(container.querySelector("[data-slot='table-header']")).toBeTruthy();
      expect(container.querySelector("[data-slot='table-body']")).toBeTruthy();
      expect(container.textContent).toContain("Col 1");
      expect(container.textContent).toContain("Data 1");
    });
  });
});
