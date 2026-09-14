import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/checkbox", () => ({
  Checkbox: {
    Root: ({
      children,
      className,
      ref,
      "data-slot": dataSlot,
      ...rest
    }: React.HTMLAttributes<HTMLButtonElement> & {
      ref?: React.Ref<HTMLButtonElement>;
      "data-slot"?: string;
    }) => (
      <button ref={ref} type="button" className={className} data-slot={dataSlot} {...rest}>
        {children}
      </button>
    ),
    Indicator: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLSpanElement> & { "data-slot"?: string }) => (
      <span className={className} data-slot={dataSlot}>
        {children}
      </span>
    ),
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { Checkbox } from "../checkbox";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Checkbox component", () => {
  describe("rendering", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox).toBeTruthy();
    });

    it("applies base checkbox styling", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.className).toContain("size-4");
      expect(checkbox?.className).toContain("rounded");
      expect(checkbox?.className).toContain("border");
    });

    it("renders checkbox indicator with data-slot", () => {
      const { container } = render(<Checkbox />);
      const indicator = container.querySelector("[data-slot='checkbox-indicator']");
      expect(indicator).toBeTruthy();
    });
  });

  describe("state variants", () => {
    it("applies default state classes", () => {
      const { container } = render(<Checkbox state="default" />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.className).toContain("border-input");
    });

    it("applies error state classes", () => {
      const { container } = render(<Checkbox state="error" />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.className).toContain("border-destructive");
    });

    it("applies success state classes", () => {
      const { container } = render(<Checkbox state="success" />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.className).toContain("border-success");
      expect(checkbox?.className).toContain("data-checked:border-success");
    });

    it("applies warning state classes", () => {
      const { container } = render(<Checkbox state="warning" />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.className).toContain("border-warning");
    });

    it("applies loading state classes", () => {
      const { container } = render(<Checkbox state="loading" />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.className).toContain("opacity-75");
      expect(checkbox?.className).toContain("cursor-not-allowed");
    });
  });

  describe("accessibility", () => {
    it("has proper focus-ring styling", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.className).toContain("focus-ring");
    });

    it("supports aria-invalid attribute", () => {
      const { container } = render(<Checkbox aria-invalid={true} />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.getAttribute("aria-invalid")).toBe("true");
    });

    it("supports aria-label attribute", () => {
      const { container } = render(<Checkbox aria-label="Accept terms" />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.getAttribute("aria-label")).toBe("Accept terms");
    });

    it("supports disabled state", () => {
      const { container } = render(<Checkbox disabled />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.className).toContain("disabled");
    });
  });

  describe("styling merge", () => {
    it("merges custom className with state classes", () => {
      const { container } = render(<Checkbox state="success" className="mt-4" />);
      const checkbox = container.querySelector("[data-slot='checkbox']");
      expect(checkbox?.className).toContain("border-success");
      expect(checkbox?.className).toContain("mt-4");
    });
  });
});
