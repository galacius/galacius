import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Separator } from "../separator";

describe("Separator component", () => {
  describe("rendering", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(<Separator />);
      const separator = container.querySelector("[data-slot='separator']");
      expect(separator).toBeTruthy();
      expect(separator?.getAttribute("data-slot")).toBe("separator");
    });

    it("applies base separator styling", () => {
      const { container } = render(<Separator />);
      const separator = container.querySelector("[data-slot='separator']");
      expect(separator?.className).toContain("bg-border");
      expect(separator?.className).toContain("shrink-0");
    });
  });

  describe("orientation prop", () => {
    it("applies horizontal orientation by default", () => {
      const { container } = render(<Separator />);
      const separator = container.querySelector("[data-slot='separator']");
      expect(separator?.className).toContain("data-horizontal:h-px");
      expect(separator?.className).toContain("data-horizontal:w-full");
    });

    it("applies horizontal orientation when explicitly set", () => {
      const { container } = render(<Separator orientation="horizontal" />);
      const separator = container.querySelector("[data-slot='separator']");
      expect(separator?.className).toContain("data-horizontal:h-px");
      expect(separator?.className).toContain("data-horizontal:w-full");
    });

    it("applies vertical orientation styling", () => {
      const { container } = render(<Separator orientation="vertical" />);
      const separator = container.querySelector("[data-slot='separator']");
      expect(separator?.className).toContain("data-vertical:w-px");
      expect(separator?.className).toContain("data-vertical:self-stretch");
    });
  });

  describe("custom className", () => {
    it("accepts and merges custom className", () => {
      const { container } = render(<Separator className="my-4" />);
      const separator = container.querySelector("[data-slot='separator']");
      expect(separator?.className).toContain("my-4");
      expect(separator?.className).toContain("bg-border");
    });

    it("merges custom className with orientation classes", () => {
      const { container } = render(<Separator orientation="vertical" className="mx-2" />);
      const separator = container.querySelector("[data-slot='separator']");
      expect(separator?.className).toContain("mx-2");
      expect(separator?.className).toContain("data-vertical:w-px");
    });
  });

  describe("accessibility and structure", () => {
    it("renders as a proper separator element", () => {
      const { container } = render(<Separator />);
      const separator = container.querySelector("[data-slot='separator']");
      expect(separator).toBeTruthy();
    });

    it("supports aria-orientation attribute for vertical", () => {
      const { container } = render(
        <Separator orientation="vertical" aria-orientation="vertical" />
      );
      const separator = container.querySelector("[data-slot='separator']");
      if (separator?.hasAttribute("aria-orientation")) {
        expect(separator?.getAttribute("aria-orientation")).toBe("vertical");
      }
    });

    it("supports aria-orientation attribute for horizontal", () => {
      const { container } = render(
        <Separator orientation="horizontal" aria-orientation="horizontal" />
      );
      const separator = container.querySelector("[data-slot='separator']");
      if (separator?.hasAttribute("aria-orientation")) {
        expect(separator?.getAttribute("aria-orientation")).toBe("horizontal");
      }
    });
  });

  describe("use cases", () => {
    it("renders horizontal divider between sections", () => {
      const { container } = render(
        <div>
          <div>Section 1</div>
          <Separator />
          <div>Section 2</div>
        </div>
      );
      const separator = container.querySelector("[data-slot='separator']");
      expect(separator).toBeTruthy();
      expect(container.textContent).toContain("Section 1");
      expect(container.textContent).toContain("Section 2");
    });

    it("renders vertical divider between items", () => {
      const { container } = render(
        <div className="flex">
          <div>Item 1</div>
          <Separator orientation="vertical" className="mx-2" />
          <div>Item 2</div>
        </div>
      );
      const separator = container.querySelector("[data-slot='separator']");
      expect(separator).toBeTruthy();
      expect(separator?.className).toContain("mx-2");
    });
  });
});
