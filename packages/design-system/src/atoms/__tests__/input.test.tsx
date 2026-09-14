import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Input } from "../input";

describe("Input component", () => {
  describe("rendering", () => {
    it("renders input element with data-slot attribute", () => {
      const { container } = render(<Input />);
      const input = container.querySelector("[data-slot='input']");
      expect(input).toBeTruthy();
      expect(input?.getAttribute("data-slot")).toBe("input");
    });

    it("applies base input styling", () => {
      const { container } = render(<Input />);
      const input = container.querySelector("[data-slot='input']");
      expect(input?.className).toContain("w-full");
      expect(input?.className).toContain("rounded-lg");
      expect(input?.className).toContain("border");
      expect(input?.className).toContain("outline-none");
    });

    it("accepts custom className", () => {
      const { container } = render(<Input className="custom-class" />);
      const input = container.querySelector("[data-slot='input']");
      expect(input?.className).toContain("custom-class");
      expect(input?.className).toContain("w-full");
    });
  });

  describe("variant prop", () => {
    it("applies default variant styling by default", () => {
      const { container } = render(<Input />);
      const input = container.querySelector("[data-slot='input']");
      expect(input?.className).toContain("border-input");
      expect(input?.className).toContain("h-8");
    });

    it("applies ghost variant styling", () => {
      const { container } = render(<Input variant="ghost" />);
      const input = container.querySelector("[data-slot='input']");
      expect(input?.className).toContain("border-0");
      expect(input?.className).toContain("border-b");
      expect(input?.className).toContain("border-b-primary");
      expect(input?.className).toContain("rounded-none");
    });
  });

  describe("state prop", () => {
    it("applies default state when no state prop", () => {
      const { container } = render(<Input />);
      const input = container.querySelector("[data-slot='input']");
      expect(input).toBeTruthy();
      // Should have border-input (default) not error/success/warning
      expect(input?.className).toContain("border-input");
    });

    it("applies error state styling", () => {
      const { container } = render(<Input state="error" />);
      const input = container.querySelector("[data-slot='input']");
      expect(input?.className).toContain("border-destructive");
      expect(input?.className).toContain("bg-destructive/5");
    });

    it("applies success state styling", () => {
      const { container } = render(<Input state="success" />);
      const input = container.querySelector("[data-slot='input']");
      expect(input?.className).toContain("border-success");
      expect(input?.className).toContain("bg-success/5");
    });

    it("applies warning state styling", () => {
      const { container } = render(<Input state="warning" />);
      const input = container.querySelector("[data-slot='input']");
      expect(input?.className).toContain("border-warning");
      expect(input?.className).toContain("bg-warning/5");
    });

    it("applies loading state styling", () => {
      const { container } = render(<Input state="loading" />);
      const input = container.querySelector("[data-slot='input']");
      expect(input?.className).toContain("opacity-75");
      expect(input?.className).toContain("cursor-not-allowed");
    });
  });

  describe("type prop", () => {
    it("renders text input by default", () => {
      const { container } = render(<Input />);
      const input = container.querySelector("input");
      expect(input?.type).toBe("text");
    });

    it("supports password type", () => {
      const { container } = render(<Input type="password" />);
      const input = container.querySelector("input");
      expect(input?.type).toBe("password");
    });

    it("supports email type", () => {
      const { container } = render(<Input type="email" />);
      const input = container.querySelector("input");
      expect(input?.type).toBe("email");
    });

    it("supports number type", () => {
      const { container } = render(<Input type="number" />);
      const input = container.querySelector("input");
      expect(input?.type).toBe("number");
    });
  });

  describe("attributes and accessibility", () => {
    it("supports placeholder attribute", () => {
      const { container } = render(<Input placeholder="Enter text" />);
      const input = container.querySelector("input");
      expect(input?.placeholder).toBe("Enter text");
    });

    it("supports disabled state", () => {
      const { container } = render(<Input disabled />);
      const input = container.querySelector("input");
      expect(input?.disabled).toBe(true);
    });

    it("supports aria-invalid attribute", () => {
      const { container } = render(<Input aria-invalid={true} state="error" />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("aria-invalid")).toBe("true");
    });

    it("supports aria-describedby attribute", () => {
      const { container } = render(<Input aria-describedby="error-message" />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("aria-describedby")).toBe("error-message");
    });

    it("supports maxLength attribute", () => {
      const { container } = render(<Input maxLength={10} />);
      const input = container.querySelector("input");
      expect(input?.maxLength).toBe(10);
    });
  });

  describe("styling combinations", () => {
    it("merges variant and state classes correctly", () => {
      const { container } = render(<Input variant="default" state="error" />);
      const input = container.querySelector("[data-slot='input']");
      expect(input?.className).toContain("h-8");
      expect(input?.className).toContain("border-destructive");
    });

    it("combines variant, state, and custom className", () => {
      const { container } = render(<Input variant="ghost" state="success" className="text-lg" />);
      const input = container.querySelector("[data-slot='input']");
      expect(input?.className).toContain("border-b");
      expect(input?.className).toContain("border-success");
      expect(input?.className).toContain("text-lg");
    });
  });
});
