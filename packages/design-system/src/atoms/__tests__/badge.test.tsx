import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "../badge";

describe("Badge component", () => {
  describe("variants", () => {
    it("renders with default variant", () => {
      const { container } = render(<Badge>Default Badge</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge).toBeTruthy();
      expect(badge?.className).toContain("bg-primary");
      expect(badge?.className).toContain("text-primary-foreground");
    });

    it("renders with secondary variant", () => {
      const { container } = render(<Badge variant="secondary">Secondary</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("bg-secondary");
      expect(badge?.className).toContain("text-secondary-foreground");
    });

    it("renders with destructive variant", () => {
      const { container } = render(<Badge variant="destructive">Destructive</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("bg-destructive/15");
      expect(badge?.className).toContain("text-destructive");
    });

    it("renders with success variant", () => {
      const { container } = render(<Badge variant="success">Success</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("bg-success/15");
      expect(badge?.className).toContain("text-success");
    });

    it("renders with warning variant", () => {
      const { container } = render(<Badge variant="warning">Warning</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("bg-warning/15");
      expect(badge?.className).toContain("text-warning");
    });

    it("renders with info variant", () => {
      const { container } = render(<Badge variant="info">Info</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("bg-info/15");
      expect(badge?.className).toContain("text-info");
    });

    it("renders with danger variant", () => {
      const { container } = render(<Badge variant="danger">Danger</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("bg-danger/15");
      expect(badge?.className).toContain("text-danger");
    });

    it("renders with ghost variant", () => {
      const { container } = render(<Badge variant="ghost">Ghost</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("bg-muted");
      expect(badge?.className).toContain("text-muted-foreground");
    });
  });

  describe("structure and styling", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(<Badge>Test Badge</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.getAttribute("data-slot")).toBe("badge");
    });

    it("applies base styling classes", () => {
      const { container } = render(<Badge>Test</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("inline-flex");
      expect(badge?.className).toContain("h-5");
      expect(badge?.className).toContain("rounded-4xl");
      expect(badge?.className).toContain("border");
      expect(badge?.className).toContain("px-2");
    });

    it("accepts custom className", () => {
      const { container } = render(<Badge className="custom-class">Test</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("custom-class");
      expect(badge?.className).toContain("bg-primary");
    });

    it("renders content correctly", () => {
      const { container } = render(<Badge>Badge Content</Badge>);
      expect(container.textContent).toContain("Badge Content");
    });
  });

  describe("focus and interaction states", () => {
    it("includes focus-visible styling", () => {
      const { container } = render(<Badge>Focused Badge</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("focus-visible:border-ring");
      expect(badge?.className).toContain("focus-visible:ring");
    });

    it("includes aria-invalid styling for destructive states", () => {
      const { container } = render(<Badge>Invalid Badge</Badge>);
      const badge = container.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("aria-invalid:border-destructive");
    });
  });

  describe("child elements", () => {
    it("renders with multiple children", () => {
      const { container } = render(
        <Badge>
          <span>Icon</span>
          <span>Text</span>
        </Badge>
      );
      expect(container.textContent).toContain("Icon");
      expect(container.textContent).toContain("Text");
    });
  });
});
