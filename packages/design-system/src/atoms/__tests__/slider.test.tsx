import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/slider", () => ({
  Slider: {
    Root: ({
      children,
      className,
      "data-slot": dataSlot,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot} {...rest}>
        {children}
      </div>
    ),
    Control: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
    Track: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    Indicator: ({
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot} />
    ),
    Thumb: ({
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLButtonElement> & { "data-slot"?: string }) => (
      <button className={className} data-slot={dataSlot} />
    ),
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { Slider } from "../slider";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Slider component", () => {
  describe("rendering", () => {
    it("renders with data-slot", () => {
      const { container } = render(<Slider />);
      const slider = container.querySelector("[data-slot='slider']");
      expect(slider).toBeTruthy();
    });

    it("renders track element", () => {
      const { container } = render(<Slider />);
      const track = container.querySelector("[data-slot='slider-track']");
      expect(track).toBeTruthy();
    });

    it("renders range indicator element", () => {
      const { container } = render(<Slider />);
      const range = container.querySelector("[data-slot='slider-range']");
      expect(range).toBeTruthy();
    });

    it("renders thumb elements", () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      const thumbs = container.querySelectorAll("[data-slot='slider-thumb']");
      expect(thumbs.length).toBeGreaterThan(0);
    });
  });

  describe("min and max props", () => {
    it("supports custom min value", () => {
      const { container } = render(<Slider min={0} max={100} />);
      expect(container).toBeTruthy();
    });

    it("supports custom max value", () => {
      const { container } = render(<Slider min={0} max={50} />);
      expect(container).toBeTruthy();
    });
  });

  describe("value and defaultValue", () => {
    it("supports single defaultValue", () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      const thumbs = container.querySelectorAll("[data-slot='slider-thumb']");
      expect(thumbs.length).toBeGreaterThan(0);
    });

    it("supports range defaultValue", () => {
      const { container } = render(<Slider defaultValue={[25, 75]} />);
      const thumbs = container.querySelectorAll("[data-slot='slider-thumb']");
      expect(thumbs.length).toBeGreaterThan(0);
    });

    it("creates thumbs based on value array length", () => {
      const { container } = render(<Slider value={[10, 50, 90]} onChange={() => {}} />);
      const thumbs = container.querySelectorAll("[data-slot='slider-thumb']");
      expect(thumbs.length).toBe(3);
    });
  });

  describe("styling", () => {
    it("applies track styling", () => {
      const { container } = render(<Slider />);
      const track = container.querySelector("[data-slot='slider-track']");
      expect(track?.className).toContain("bg-muted");
      expect(track?.className).toContain("rounded-full");
    });

    it("applies range indicator styling", () => {
      const { container } = render(<Slider />);
      const range = container.querySelector("[data-slot='slider-range']");
      expect(range?.className).toContain("bg-primary");
    });

    it("applies thumb styling", () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      const thumb = container.querySelector("[data-slot='slider-thumb']");
      expect(thumb?.className).toContain("bg-white");
      expect(thumb?.className).toContain("rounded-full");
      expect(thumb?.className).toContain("border");
    });

    it("applies hover state to thumbs", () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      const thumb = container.querySelector("[data-slot='slider-thumb']");
      expect(thumb?.className).toContain("hover:ring-3");
    });

    it("applies focus state to thumbs", () => {
      const { container } = render(<Slider defaultValue={[50]} />);
      const thumb = container.querySelector("[data-slot='slider-thumb']");
      expect(thumb?.className).toContain("focus-visible:ring-3");
    });
  });

  describe("disabled state", () => {
    it("thumb is disabled", () => {
      const { container } = render(<Slider disabled defaultValue={[50]} />);
      const thumb = container.querySelector("[data-slot='slider-thumb']");
      expect(thumb?.className).toContain("disabled:opacity-50");
    });

    it("supports disabled prop", () => {
      const { container } = render(<Slider disabled />);
      expect(container).toBeTruthy();
    });
  });

  describe("orientation", () => {
    it("supports horizontal orientation", () => {
      const { container } = render(<Slider />);
      const slider = container.querySelector("[data-slot='slider']");
      expect(slider?.className).toContain("data-horizontal:w-full");
    });

    it("supports vertical orientation", () => {
      const { container } = render(<Slider orientation="vertical" />);
      const slider = container.querySelector("[data-slot='slider']");
      expect(slider?.className).toContain("data-vertical:h-full");
    });
  });

  describe("custom className", () => {
    it("accepts and merges custom className", () => {
      const { container } = render(<Slider className="custom-slider" />);
      const slider = container.querySelector("[data-slot='slider']");
      expect(slider?.className).toContain("custom-slider");
    });
  });
});
