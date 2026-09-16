import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/dialog", () => ({
  Dialog: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Portal: ({
      children,
      "data-slot": dataSlot,
    }: {
      children: React.ReactNode;
      "data-slot"?: string;
    }) => <div data-slot={dataSlot}>{children}</div>,
    Close: ({ children, "data-slot": dataSlot, render: renderProp, ...rest }: any) => {
      if (renderProp) {
        return React.cloneElement(renderProp, { "data-slot": dataSlot, ...rest }, children);
      }
      return (
        <button data-slot={dataSlot} {...rest}>
          {children}
        </button>
      );
    },
    Backdrop: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    Popup: ({
      children,
      className,
      "data-slot": dataSlot,
      "data-side": dataSide,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string; "data-side"?: string }) => (
      <div className={className} data-slot={dataSlot} data-side={dataSide}>
        {children}
      </div>
    ),
    Title: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLHeadingElement> & { "data-slot"?: string }) => (
      <h2 className={className} data-slot={dataSlot}>
        {children}
      </h2>
    ),
    Description: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLParagraphElement> & { "data-slot"?: string }) => (
      <p className={className} data-slot={dataSlot}>
        {children}
      </p>
    ),
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "../sheet";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Sheet components", () => {
  describe("Sheet root", () => {
    it("renders", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );
      expect(container).toBeTruthy();
    });
  });

  describe("SheetTrigger", () => {
    it("renders trigger", () => {
      const { container } = render(
        <Sheet>
          <SheetTrigger>Open Sheet</SheetTrigger>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );
      expect(container.textContent).toContain("Open Sheet");
    });
  });

  describe("SheetContent", () => {
    it("renders content with data-slot", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>Sheet content</SheetContent>
        </Sheet>
      );
      const content = container.querySelector("[data-slot='sheet-content']");
      expect(content).toBeTruthy();
      expect(container.textContent).toContain("Sheet content");
    });

    it("applies content styling", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );
      const content = container.querySelector("[data-slot='sheet-content']");
      expect(content?.className).toContain("bg-popover");
      expect(content?.className).toContain("text-popover-foreground");
      expect(content?.className).toContain("flex");
    });

    it("renders with default side right", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );
      const content = container.querySelector("[data-slot='sheet-content']");
      expect(content?.getAttribute("data-side")).toBe("right");
    });

    it("renders with custom side left", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent side="left">Content</SheetContent>
        </Sheet>
      );
      const content = container.querySelector("[data-slot='sheet-content']");
      expect(content?.getAttribute("data-side")).toBe("left");
    });

    it("applies animation classes", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );
      const content = container.querySelector("[data-slot='sheet-content']");
      expect(content?.className).toContain("transition");
    });

    it("renders with animation classes", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );
      const content = container.querySelector("[data-slot='sheet-content']");
      expect(content?.className).toContain("data-ending-style:opacity-0");
      expect(content?.className).toContain("data-starting-style:opacity-0");
    });
  });

  describe("SheetOverlay", () => {
    it("renders overlay with data-slot", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );
      const overlay = container.querySelector("[data-slot='sheet-overlay']");
      expect(overlay).toBeTruthy();
    });

    it("applies overlay styling", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>Content</SheetContent>
        </Sheet>
      );
      const overlay = container.querySelector("[data-slot='sheet-overlay']");
      expect(overlay?.className).toContain("z-overlay");
      expect(overlay?.className).toContain("fixed");
      expect(overlay?.className).toContain("bg-black/10");
    });
  });

  describe("SheetHeader", () => {
    it("renders header", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>
            <SheetHeader>Header</SheetHeader>
          </SheetContent>
        </Sheet>
      );
      const header = container.querySelector("[data-slot='sheet-header']");
      expect(header?.className).toContain("flex");
      expect(header?.className).toContain("flex-col");
    });
  });

  describe("SheetTitle", () => {
    it("renders title with data-slot", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );
      const title = container.querySelector("[data-slot='sheet-title']");
      expect(title).toBeTruthy();
      expect(container.textContent).toContain("Title");
    });

    it("applies title styling", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );
      const title = container.querySelector("[data-slot='sheet-title']");
      expect(title?.className).toContain("font-heading");
      expect(title?.className).toContain("text-base");
    });
  });

  describe("SheetDescription", () => {
    it("renders description with data-slot", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>
            <SheetDescription>Description</SheetDescription>
          </SheetContent>
        </Sheet>
      );
      const description = container.querySelector("[data-slot='sheet-description']");
      expect(description).toBeTruthy();
    });

    it("applies description styling", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>
            <SheetDescription>Description</SheetDescription>
          </SheetContent>
        </Sheet>
      );
      const description = container.querySelector("[data-slot='sheet-description']");
      expect(description?.className).toContain("text-muted-foreground");
    });
  });

  describe("SheetFooter", () => {
    it("renders footer", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>
            <SheetFooter>Footer</SheetFooter>
          </SheetContent>
        </Sheet>
      );
      const footer = container.querySelector("[data-slot='sheet-footer']");
      expect(footer).toBeTruthy();
    });

    it("applies footer styling", () => {
      const { container } = render(
        <Sheet open={true}>
          <SheetContent>
            <SheetFooter>Footer</SheetFooter>
          </SheetContent>
        </Sheet>
      );
      const footer = container.querySelector("[data-slot='sheet-footer']");
      expect(footer?.className).toContain("mt-auto");
      expect(footer?.className).toContain("flex");
    });
  });
});
