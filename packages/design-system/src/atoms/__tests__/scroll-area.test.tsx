import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/scroll-area", () => ({
  ScrollArea: {
    Root: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    Viewport: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    Scrollbar: ({
      children,
      className,
      "data-slot": dataSlot,
      "data-orientation": dataOrientation,
    }: React.HTMLAttributes<HTMLDivElement> & {
      "data-slot"?: string;
      "data-orientation"?: string;
    }) => (
      <div className={className} data-slot={dataSlot} data-orientation={dataOrientation}>
        {children}
      </div>
    ),
    Thumb: ({
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot} />
    ),
    Corner: () => null,
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { ScrollArea, ScrollBar } from "../scroll-area";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("ScrollArea component", () => {
  describe("ScrollArea root", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      const scrollArea = container.querySelector("[data-slot='scroll-area']");
      expect(scrollArea).toBeTruthy();
    });

    it("applies base styling", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      const scrollArea = container.querySelector("[data-slot='scroll-area']");
      expect(scrollArea?.className).toContain("relative");
    });

    it("accepts custom className", () => {
      const { container } = render(
        <ScrollArea className="custom-scroll">
          <div>Content</div>
        </ScrollArea>
      );
      const scrollArea = container.querySelector("[data-slot='scroll-area']");
      expect(scrollArea?.className).toContain("custom-scroll");
      expect(scrollArea?.className).toContain("relative");
    });
  });

  describe("ScrollArea viewport", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      const viewport = container.querySelector("[data-slot='scroll-area-viewport']");
      expect(viewport).toBeTruthy();
    });

    it("applies viewport styling", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      const viewport = container.querySelector("[data-slot='scroll-area-viewport']");
      expect(viewport?.className).toContain("size-full");
      expect(viewport?.className).toContain("outline-none");
    });

    it("renders viewport content", () => {
      const { container } = render(
        <ScrollArea>
          <div>Scrollable content here</div>
        </ScrollArea>
      );
      expect(container.textContent).toContain("Scrollable content here");
    });
  });

  describe("ScrollBar", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      const scrollbar = container.querySelector("[data-slot='scroll-area-scrollbar']");
      expect(scrollbar).toBeTruthy();
    });

    it("renders vertical scrollbar by default", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      const scrollbar = container.querySelector(
        "[data-slot='scroll-area-scrollbar'][data-orientation='vertical']"
      );
      expect(scrollbar).toBeTruthy();
    });

    it("applies vertical scrollbar styling", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      const scrollbar = container.querySelector(
        "[data-slot='scroll-area-scrollbar'][data-orientation='vertical']"
      );
      expect(scrollbar?.className).toContain("data-vertical:h-full");
      expect(scrollbar?.className).toContain("data-vertical:w-2.5");
    });

    it("renders horizontal scrollbar with custom orientation", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      );
      const scrollbar = container.querySelector(
        "[data-slot='scroll-area-scrollbar'][data-orientation='horizontal']"
      );
      expect(scrollbar).toBeTruthy();
    });

    it("accepts custom className", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
          <ScrollBar className="custom-bar" orientation="horizontal" />
        </ScrollArea>
      );
      const scrollbar = container.querySelector(
        "[data-slot='scroll-area-scrollbar'][data-orientation='horizontal']"
      );
      expect(scrollbar?.className).toContain("custom-bar");
    });
  });

  describe("ScrollArea thumb", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      const thumb = container.querySelector("[data-slot='scroll-area-thumb']");
      expect(thumb).toBeTruthy();
    });

    it("applies thumb styling", () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      );
      const thumb = container.querySelector("[data-slot='scroll-area-thumb']");
      expect(thumb?.className).toContain("bg-border");
      expect(thumb?.className).toContain("rounded-full");
    });
  });

  describe("integration", () => {
    it("renders complete scroll area structure", () => {
      const { container } = render(
        <ScrollArea>
          <div style={{ height: "200px", overflow: "hidden" }}>Long content here</div>
        </ScrollArea>
      );
      expect(container.querySelector("[data-slot='scroll-area']")).toBeTruthy();
      expect(container.querySelector("[data-slot='scroll-area-viewport']")).toBeTruthy();
      expect(container.querySelector("[data-slot='scroll-area-scrollbar']")).toBeTruthy();
      expect(container.querySelector("[data-slot='scroll-area-thumb']")).toBeTruthy();
    });
  });
});
