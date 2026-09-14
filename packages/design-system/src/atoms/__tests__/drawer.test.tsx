import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/drawer", () => ({
  Drawer: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Portal: ({
      children,
      "data-slot": dataSlot,
    }: {
      children: React.ReactNode;
      "data-slot"?: string;
    }) => <div data-slot={dataSlot}>{children}</div>,
    Viewport: ({
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
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    Content: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { Drawer, DrawerPortal, DrawerViewport, DrawerPopup, DrawerContent } from "../drawer";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Drawer components", () => {
  describe("Drawer root", () => {
    it("renders", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport>
              <DrawerPopup>Content</DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      expect(container).toBeTruthy();
    });
  });

  describe("DrawerPortal", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport>
              <DrawerPopup>Content</DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      const portal = container.querySelector("[data-slot='drawer-portal']");
      expect(portal).toBeTruthy();
    });
  });

  describe("DrawerViewport", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport>
              <DrawerPopup>Content</DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      const viewport = container.querySelector("[data-slot='drawer-viewport']");
      expect(viewport).toBeTruthy();
    });

    it("applies viewport styling", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport>
              <DrawerPopup>Content</DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      const viewport = container.querySelector("[data-slot='drawer-viewport']");
      expect(viewport?.className).toContain("z-overlay");
      expect(viewport?.className).toContain("fixed");
      expect(viewport?.className).toContain("pointer-events-none");
    });

    it("supports custom className", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport className="custom-viewport">
              <DrawerPopup>Content</DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      const viewport = container.querySelector("[data-slot='drawer-viewport']");
      expect(viewport?.className).toContain("custom-viewport");
    });
  });

  describe("DrawerPopup", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport>
              <DrawerPopup>Content</DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      const popup = container.querySelector("[data-slot='drawer-popup']");
      expect(popup).toBeTruthy();
    });

    it("applies popup styling", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport>
              <DrawerPopup>Content</DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      const popup = container.querySelector("[data-slot='drawer-popup']");
      expect(popup?.className).toContain("bg-background");
      expect(popup?.className).toContain("text-foreground");
      expect(popup?.className).toContain("flex");
    });

    it("renders content", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport>
              <DrawerPopup>Drawer content here</DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      expect(container.textContent).toContain("Drawer content here");
    });
  });

  describe("DrawerContent", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport>
              <DrawerPopup>
                <DrawerContent>Content</DrawerContent>
              </DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      const content = container.querySelector("[data-slot='drawer-content']");
      expect(content).toBeTruthy();
    });

    it("applies content styling", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport>
              <DrawerPopup>
                <DrawerContent>Content</DrawerContent>
              </DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      const content = container.querySelector("[data-slot='drawer-content']");
      expect(content?.className).toContain("flex");
      expect(content?.className).toContain("min-h-0");
      expect(content?.className).toContain("flex-1");
    });
  });

  describe("integration", () => {
    it("renders complete drawer structure", () => {
      const { container } = render(
        <Drawer open={true}>
          <DrawerPortal>
            <DrawerViewport>
              <DrawerPopup>
                <DrawerContent>Drawer content</DrawerContent>
              </DrawerPopup>
            </DrawerViewport>
          </DrawerPortal>
        </Drawer>
      );
      expect(container.querySelector("[data-slot='drawer-portal']")).toBeTruthy();
      expect(container.querySelector("[data-slot='drawer-viewport']")).toBeTruthy();
      expect(container.querySelector("[data-slot='drawer-popup']")).toBeTruthy();
      expect(container.querySelector("[data-slot='drawer-content']")).toBeTruthy();
    });
  });
});
