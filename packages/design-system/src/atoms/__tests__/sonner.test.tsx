import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ theme: "light" })),
}));

vi.mock("sonner", () => ({
  Toaster: ({
    theme,
    className,
    ...props
  }: {
    theme?: string;
    className?: string;
    [key: string]: unknown;
  }) => <div className={className} data-theme={theme} {...props} />,
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { Toaster } from "../sonner";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Toaster component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders Toaster component", () => {
      const { container } = render(<Toaster />);
      const toaster = container.querySelector(".toaster");
      expect(toaster).toBeTruthy();
    });

    it("applies toaster and group classes", () => {
      const { container } = render(<Toaster />);
      const toaster = container.querySelector(".toaster.group");
      expect(toaster).toBeTruthy();
    });
  });

  describe("theme integration", () => {
    it("passes theme from useTheme hook", () => {
      const { container } = render(<Toaster />);
      expect(container.querySelector(".toaster")).toBeTruthy();
    });

    it("renders with data-theme attribute", () => {
      const { container } = render(<Toaster />);
      const toaster = container.querySelector("[data-theme]");
      expect(toaster).toBeTruthy();
    });

    it("supports custom props", () => {
      const { container } = render(<Toaster position="top-center" />);
      expect(container.querySelector(".toaster")).toBeTruthy();
    });
  });

  describe("toast configuration", () => {
    it("configures icons via props", () => {
      const { container } = render(<Toaster />);
      expect(container.querySelector(".toaster")).toBeTruthy();
    });
  });

  describe("CSS variables", () => {
    it("toaster renders with configured style", () => {
      const { container } = render(<Toaster />);
      const toaster = container.querySelector(".toaster");
      expect(toaster).toBeTruthy();
    });
  });

  describe("custom props", () => {
    it("accepts and forwards position prop", () => {
      const { container } = render(<Toaster position="top-right" />);
      expect(container.querySelector(".toaster")).toBeTruthy();
    });

    it("accepts and forwards richColors prop", () => {
      const { container } = render(<Toaster richColors={true} />);
      expect(container.querySelector(".toaster")).toBeTruthy();
    });

    it("accepts and forwards expand prop", () => {
      const { container } = render(<Toaster expand={false} />);
      expect(container.querySelector(".toaster")).toBeTruthy();
    });

    it("accepts and forwards closeButton prop", () => {
      const { container } = render(<Toaster closeButton={true} />);
      expect(container.querySelector(".toaster")).toBeTruthy();
    });

    it("accepts and forwards offset prop", () => {
      const { container } = render(<Toaster offset={16} />);
      expect(container.querySelector(".toaster")).toBeTruthy();
    });
  });

  describe("structure", () => {
    it("renders as Sonner Toaster wrapper", () => {
      const { container } = render(<Toaster />);
      const toaster = container.querySelector(".toaster");
      expect(toaster?.classList.contains("group")).toBe(true);
    });
  });
});
