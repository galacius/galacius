import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Switch } from "../switch";

describe("Switch component", () => {
  describe("rendering", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(<Switch />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl).toBeTruthy();
      expect(switchEl?.getAttribute("data-slot")).toBe("switch");
    });

    it("applies base styling classes", () => {
      const { container } = render(<Switch />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl?.className).toContain("inline-flex");
      expect(switchEl?.className).toContain("rounded-full");
      expect(switchEl?.className).toContain("border");
    });

    it("renders thumb element with data-slot", () => {
      const { container } = render(<Switch />);
      const thumb = container.querySelector("[data-slot='switch-thumb']");
      expect(thumb).toBeTruthy();
      expect(thumb?.getAttribute("data-slot")).toBe("switch-thumb");
    });
  });

  describe("size prop", () => {
    it("applies default size styling", () => {
      const { container } = render(<Switch size="default" />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl?.getAttribute("data-size")).toBe("default");
      expect(switchEl?.className).toContain("h-[18.4px]");
      expect(switchEl?.className).toContain("w-8");
    });

    it("applies small size styling", () => {
      const { container } = render(<Switch size="sm" />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl?.getAttribute("data-size")).toBe("sm");
      expect(switchEl?.className).toContain("h-3.5");
      expect(switchEl?.className).toContain("w-6");
    });

    it("defaults to default size when size prop not provided", () => {
      const { container } = render(<Switch />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl?.getAttribute("data-size")).toBe("default");
    });
  });

  describe("styling", () => {
    it("applies checked styling", () => {
      const { container } = render(<Switch defaultChecked />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl?.className).toContain("data-checked:bg-primary");
    });

    it("applies unchecked styling", () => {
      const { container } = render(<Switch />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl?.className).toContain("data-unchecked:bg-input");
    });

    it("thumb applies size-specific styling for default", () => {
      const { container } = render(<Switch size="default" />);
      const thumb = container.querySelector("[data-slot='switch-thumb']");
      expect(thumb?.className).toContain("group-data-[size=default]/switch:size-4");
    });

    it("thumb applies size-specific styling for sm", () => {
      const { container } = render(<Switch size="sm" />);
      const thumb = container.querySelector("[data-slot='switch-thumb']");
      expect(thumb?.className).toContain("group-data-[size=sm]/switch:size-3");
    });
  });

  describe("accessibility", () => {
    it("includes focus-ring styling", () => {
      const { container } = render(<Switch />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl?.className).toContain("focus-ring");
    });

    it("supports disabled state", () => {
      const { container } = render(<Switch disabled />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl?.className).toContain("data-disabled:cursor-not-allowed");
      expect(switchEl?.className).toContain("data-disabled:opacity-50");
    });

    it("includes transition-interactive class", () => {
      const { container } = render(<Switch />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl?.className).toContain("transition-interactive");
    });
  });

  describe("custom className", () => {
    it("accepts and merges custom className", () => {
      const { container } = render(<Switch className="custom-switch" />);
      const switchEl = container.querySelector("[data-slot='switch']");
      expect(switchEl?.className).toContain("custom-switch");
      expect(switchEl?.className).toContain("inline-flex");
    });
  });
});
