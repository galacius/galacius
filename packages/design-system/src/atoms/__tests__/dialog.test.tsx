import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/dialog", () => ({
  Dialog: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({
      children,
      "data-slot": dataSlot,
    }: {
      children?: React.ReactNode;
      "data-slot"?: string;
    }) => <button data-slot={dataSlot}>{children}</button>,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
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
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../dialog";
import { Button } from "../button";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Dialog components", () => {
  describe("Dialog root", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );
      expect(container).toBeTruthy();
    });
  });

  describe("DialogTrigger", () => {
    it("renders trigger", () => {
      const { container } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );
      expect(container.textContent).toContain("Open");
    });
  });

  describe("DialogContent", () => {
    it("renders content", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>Dialog content</DialogContent>
        </Dialog>
      );
      const content = container.querySelector("[data-slot='dialog-content']");
      expect(content).toBeTruthy();
      expect(container.textContent).toContain("Dialog content");
    });

    it("applies base content styling", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>Dialog content</DialogContent>
        </Dialog>
      );
      const content = container.querySelector("[data-slot='dialog-content']");
      expect(content?.className).toContain("bg-popover");
      expect(content?.className).toContain("rounded-xl");
      expect(content?.className).toContain("shadow-depth-2");
    });

    it("renders with size sm by default", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );
      const content = container.querySelector("[data-slot='dialog-content']");
      expect(content?.className).toContain("sm:max-w-sm");
    });

    it("renders with custom size md", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent size="md">Content</DialogContent>
        </Dialog>
      );
      const content = container.querySelector("[data-slot='dialog-content']");
      expect(content?.className).toContain("sm:max-w-md");
    });

    it("hides close button by default", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );
      const closeButtons = container.querySelectorAll("[data-slot='dialog-close']");
      expect(closeButtons.length).toBe(0);
    });

    it("renders close button when showCloseButton=true", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent showCloseButton={true}>Content</DialogContent>
        </Dialog>
      );
      const closeButton = container.querySelector("[data-slot='dialog-close']");
      expect(closeButton).toBeTruthy();
    });
  });

  describe("DialogHeader", () => {
    it("renders header with styling", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>Header</DialogHeader>
          </DialogContent>
        </Dialog>
      );
      const header = container.querySelector("[data-slot='dialog-header']");
      expect(header?.className).toContain("flex");
      expect(header?.className).toContain("flex-col");
    });
  });

  describe("DialogTitle", () => {
    it("renders title with data-slot", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
      const title = container.querySelector("[data-slot='dialog-title']");
      expect(title).toBeTruthy();
      expect(container.textContent).toContain("Title");
    });

    it("applies heading typography", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
      const title = container.querySelector("[data-slot='dialog-title']");
      expect(title?.className).toContain("font-heading");
      expect(title?.className).toContain("text-h2");
    });
  });

  describe("DialogDescription", () => {
    it("renders description with data-slot", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>
            <DialogDescription>Description text</DialogDescription>
          </DialogContent>
        </Dialog>
      );
      const description = container.querySelector("[data-slot='dialog-description']");
      expect(description).toBeTruthy();
    });

    it("applies muted foreground color", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>
            <DialogDescription>Description text</DialogDescription>
          </DialogContent>
        </Dialog>
      );
      const description = container.querySelector("[data-slot='dialog-description']");
      expect(description?.className).toContain("text-muted-foreground");
    });
  });

  describe("DialogFooter", () => {
    it("renders footer with data-slot", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>
            <DialogFooter>
              <Button>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
      const footer = container.querySelector("[data-slot='dialog-footer']");
      expect(footer).toBeTruthy();
    });

    it("applies footer styling", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>
            <DialogFooter>
              <Button>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
      const footer = container.querySelector("[data-slot='dialog-footer']");
      expect(footer?.className).toContain("bg-muted/50");
      expect(footer?.className).toContain("flex");
    });
  });

  describe("DialogOverlay", () => {
    it("renders overlay with styling", () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );
      const overlay = container.querySelector("[data-slot='dialog-overlay']");
      expect(overlay).toBeTruthy();
      expect(overlay?.className).toContain("z-overlay");
      expect(overlay?.className).toContain("fixed");
    });
  });
});
