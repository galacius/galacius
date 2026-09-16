import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/context-menu", () => ({
  ContextMenu: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Positioner: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Popup: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
    Item: ({
      children,
      className,
      "data-disabled": dataDisabled,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-disabled"?: boolean }) => (
      <div role="menuitem" className={className} data-disabled={dataDisabled}>
        {children}
      </div>
    ),
    Separator: () => <hr />,
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "../context-menu";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("ContextMenu components", () => {
  describe("ContextMenu root", () => {
    it("renders ContextMenu", () => {
      const { container } = render(
        <ContextMenu>
          <ContextMenuTrigger>Right click</ContextMenuTrigger>
          <ContextMenuContent>Menu</ContextMenuContent>
        </ContextMenu>
      );
      expect(container.textContent).toContain("Right click");
    });
  });

  describe("ContextMenuTrigger", () => {
    it("renders trigger element", () => {
      const { container } = render(
        <ContextMenu>
          <ContextMenuTrigger>Right click me</ContextMenuTrigger>
          <ContextMenuContent>Menu</ContextMenuContent>
        </ContextMenu>
      );
      expect(container.textContent).toContain("Right click me");
    });
  });

  describe("ContextMenuContent", () => {
    it("renders content", () => {
      const { container } = render(
        <ContextMenu open={true}>
          <ContextMenuTrigger>Right click</ContextMenuTrigger>
          <ContextMenuContent>Menu content</ContextMenuContent>
        </ContextMenu>
      );
      expect(container.textContent).toContain("Menu content");
    });
  });

  describe("ContextMenuItem", () => {
    it("renders menu item text", () => {
      const { container } = render(
        <ContextMenu open={true}>
          <ContextMenuTrigger>Right click</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Edit</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
      expect(container.textContent).toContain("Edit");
    });

    it("renders multiple menu items", () => {
      const { container } = render(
        <ContextMenu open={true}>
          <ContextMenuTrigger>Right click</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Cut</ContextMenuItem>
            <ContextMenuItem>Copy</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
      expect(container.textContent).toContain("Cut");
      expect(container.textContent).toContain("Copy");
    });

    it("supports custom className", () => {
      const { container } = render(
        <ContextMenu open={true}>
          <ContextMenuTrigger>Right click</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem className="custom-item">Item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
      const item = container.querySelector("[role='menuitem']");
      expect(item?.className).toContain("custom-item");
    });
  });

  describe("ContextMenuSeparator", () => {
    it("renders separator", () => {
      const { container } = render(
        <ContextMenu open={true}>
          <ContextMenuTrigger>Right click</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Item 2</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
      expect(container.textContent).toContain("Item 1");
      expect(container.textContent).toContain("Item 2");
    });
  });

  describe("integration", () => {
    it("renders complete context menu structure", () => {
      const { container } = render(
        <ContextMenu open={true}>
          <ContextMenuTrigger>Right click area</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Edit</ContextMenuItem>
            <ContextMenuItem>Copy</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
      expect(container.textContent).toContain("Right click area");
      expect(container.textContent).toContain("Edit");
      expect(container.textContent).toContain("Copy");
      expect(container.textContent).toContain("Delete");
    });
  });
});
