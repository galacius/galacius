import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/popover", () => ({
  Popover: {
    Root: ({
      children,
      "data-slot": dataSlot,
    }: {
      children: React.ReactNode;
      "data-slot"?: string;
    }) => <div data-slot={dataSlot}>{children}</div>,
    Trigger: ({ children, "data-slot": dataSlot, render: renderProp, ...rest }: any) => {
      if (renderProp) {
        return React.cloneElement(renderProp, { "data-slot": dataSlot, ...rest }, children);
      }
      return (
        <button data-slot={dataSlot} {...rest}>
          {children}
        </button>
      );
    },
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Positioner: ({
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
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { Popover, PopoverTrigger, PopoverContent } from "../popover";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Popover components", () => {
  describe("Popover root", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click</PopoverTrigger>
          <PopoverContent>Popover text</PopoverContent>
        </Popover>
      );
      const popover = container.querySelector("[data-slot='popover']");
      expect(popover).toBeTruthy();
    });
  });

  describe("PopoverTrigger", () => {
    it("renders trigger with data-slot", () => {
      const { container } = render(
        <Popover>
          <PopoverTrigger>Click me</PopoverTrigger>
          <PopoverContent>Popover text</PopoverContent>
        </Popover>
      );
      const trigger = container.querySelector("[data-slot='popover-trigger']");
      expect(trigger).toBeTruthy();
    });

    it("renders trigger text", () => {
      const { container } = render(
        <Popover>
          <PopoverTrigger>Click here</PopoverTrigger>
          <PopoverContent>Popover text</PopoverContent>
        </Popover>
      );
      expect(container.textContent).toContain("Click here");
    });

    it("accepts custom className", () => {
      const { container } = render(
        <Popover>
          <PopoverTrigger className="custom-trigger">Click</PopoverTrigger>
          <PopoverContent>Popover text</PopoverContent>
        </Popover>
      );
      const trigger = container.querySelector("[data-slot='popover-trigger']");
      expect(trigger?.className).toContain("custom-trigger");
    });
  });

  describe("PopoverContent", () => {
    it("renders content with data-slot", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      );
      const content = container.querySelector("[data-slot='popover-content']");
      expect(content).toBeTruthy();
    });

    it("applies content styling", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      );
      const content = container.querySelector("[data-slot='popover-content']");
      expect(content?.className).toContain("bg-popover");
      expect(content?.className).toContain("text-popover-foreground");
      expect(content?.className).toContain("border");
      expect(content?.className).toContain("rounded-md");
    });

    it("renders popover text", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click</PopoverTrigger>
          <PopoverContent>This is a popover</PopoverContent>
        </Popover>
      );
      expect(container.textContent).toContain("This is a popover");
    });

    it("supports default side bottom", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click</PopoverTrigger>
          <PopoverContent>Popover content</PopoverContent>
        </Popover>
      );
      const content = container.querySelector("[data-slot='popover-content']");
      expect(content?.className).toContain("data-[side=bottom]:slide-in-from-top-2");
    });

    it("supports custom side top", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click</PopoverTrigger>
          <PopoverContent side="top">Popover content</PopoverContent>
        </Popover>
      );
      const content = container.querySelector("[data-slot='popover-content']");
      expect(content?.className).toContain("data-[side=top]:slide-in-from-bottom-2");
    });

    it("supports custom side left", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click</PopoverTrigger>
          <PopoverContent side="left">Popover content</PopoverContent>
        </Popover>
      );
      const content = container.querySelector("[data-slot='popover-content']");
      expect(content?.className).toContain("data-[side=left]:slide-in-from-right-2");
    });

    it("supports custom side right", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click</PopoverTrigger>
          <PopoverContent side="right">Popover content</PopoverContent>
        </Popover>
      );
      const content = container.querySelector("[data-slot='popover-content']");
      expect(content?.className).toContain("data-[side=right]:slide-in-from-left-2");
    });

    it("supports custom className", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click</PopoverTrigger>
          <PopoverContent className="custom-popover">Popover content</PopoverContent>
        </Popover>
      );
      const content = container.querySelector("[data-slot='popover-content']");
      expect(content?.className).toContain("custom-popover");
    });

    it("supports custom align", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click</PopoverTrigger>
          <PopoverContent align="center">Popover content</PopoverContent>
        </Popover>
      );
      const content = container.querySelector("[data-slot='popover-content']");
      expect(content).toBeTruthy();
    });
  });

  describe("integration", () => {
    it("renders complete popover structure", () => {
      const { container } = render(
        <Popover open={true}>
          <PopoverTrigger>Click me</PopoverTrigger>
          <PopoverContent side="bottom">Popover body here</PopoverContent>
        </Popover>
      );
      expect(container.querySelector("[data-slot='popover']")).toBeTruthy();
      expect(container.querySelector("[data-slot='popover-trigger']")).toBeTruthy();
      expect(container.querySelector("[data-slot='popover-content']")).toBeTruthy();
    });
  });
});
