import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/tooltip", () => ({
  Tooltip: {
    Provider: ({ children, delay }: { children: React.ReactNode; delay?: number }) => (
      <div data-slot="tooltip-provider" data-delay={delay}>
        {children}
      </div>
    ),
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
    Arrow: ({ className }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} />,
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../tooltip";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Tooltip components", () => {
  describe("TooltipProvider", () => {
    it("renders provider with data-slot", () => {
      const { container } = render(
        <TooltipProvider delay={0}>
          <Tooltip>
            <TooltipTrigger>Hover</TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      const provider = container.querySelector("[data-slot='tooltip-provider']");
      expect(provider).toBeTruthy();
    });

    it("supports custom delay prop", () => {
      const { container } = render(
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger>Hover</TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      const provider = container.querySelector("[data-slot='tooltip-provider']");
      expect(provider?.getAttribute("data-delay")).toBe("200");
    });
  });

  describe("Tooltip root", () => {
    it("renders with data-slot", () => {
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );
      const tooltip = container.querySelector("[data-slot='tooltip']");
      expect(tooltip).toBeTruthy();
    });
  });

  describe("TooltipTrigger", () => {
    it("renders trigger with data-slot", () => {
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );
      const trigger = container.querySelector("[data-slot='tooltip-trigger']");
      expect(trigger).toBeTruthy();
    });

    it("renders trigger text", () => {
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>Hover here</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );
      expect(container.textContent).toContain("Hover here");
    });

    it("accepts custom className", () => {
      const { container } = render(
        <Tooltip>
          <TooltipTrigger className="custom-trigger">Hover</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );
      const trigger = container.querySelector("[data-slot='tooltip-trigger']");
      expect(trigger?.className).toContain("custom-trigger");
    });

    it("accepts custom className", () => {
      const { container } = render(
        <Tooltip>
          <TooltipTrigger className="custom-trigger">Hover</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      );
      const trigger = container.querySelector("[data-slot='tooltip-trigger']");
      expect(trigger?.className).toContain("custom-trigger");
    });
  });

  describe("TooltipContent", () => {
    it("renders content with data-slot", () => {
      const { container } = render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );
      const content = container.querySelector("[data-slot='tooltip-content']");
      expect(content).toBeTruthy();
    });

    it("applies content styling", () => {
      const { container } = render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );
      const content = container.querySelector("[data-slot='tooltip-content']");
      expect(content?.className).toContain("bg-foreground");
      expect(content?.className).toContain("text-background");
      expect(content?.className).toContain("rounded-md");
    });

    it("renders tooltip text", () => {
      const { container } = render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>This is a tooltip</TooltipContent>
        </Tooltip>
      );
      expect(container.textContent).toContain("This is a tooltip");
    });

    it("supports default side top", () => {
      const { container } = render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      );
      const content = container.querySelector("[data-slot='tooltip-content']");
      expect(content?.className).toContain("data-[side=top]:slide-in-from-bottom-2");
    });

    it("supports custom side bottom", () => {
      const { container } = render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent side="bottom">Tooltip content</TooltipContent>
        </Tooltip>
      );
      const content = container.querySelector("[data-slot='tooltip-content']");
      expect(content?.className).toContain("data-[side=bottom]:slide-in-from-top-2");
    });

    it("supports custom side left", () => {
      const { container } = render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent side="left">Tooltip content</TooltipContent>
        </Tooltip>
      );
      const content = container.querySelector("[data-slot='tooltip-content']");
      expect(content?.className).toContain("data-[side=left]:slide-in-from-right-2");
    });

    it("supports custom side right", () => {
      const { container } = render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent side="right">Tooltip content</TooltipContent>
        </Tooltip>
      );
      const content = container.querySelector("[data-slot='tooltip-content']");
      expect(content?.className).toContain("data-[side=right]:slide-in-from-left-2");
    });

    it("supports custom className", () => {
      const { container } = render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent className="custom-tooltip">Tooltip content</TooltipContent>
        </Tooltip>
      );
      const content = container.querySelector("[data-slot='tooltip-content']");
      expect(content?.className).toContain("custom-tooltip");
    });
  });

  describe("integration", () => {
    it("renders complete tooltip structure", () => {
      const { container } = render(
        <Tooltip open={true}>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent side="bottom">Helpful text here</TooltipContent>
        </Tooltip>
      );
      expect(container.querySelector("[data-slot='tooltip']")).toBeTruthy();
      expect(container.querySelector("[data-slot='tooltip-trigger']")).toBeTruthy();
      expect(container.querySelector("[data-slot='tooltip-content']")).toBeTruthy();
    });
  });
});
