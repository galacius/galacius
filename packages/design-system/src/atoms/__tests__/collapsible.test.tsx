import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/collapsible", () => ({
  Collapsible: {
    Root: ({
      children,
      "data-slot": dataSlot,
      ...rest
    }: {
      children?: React.ReactNode;
      "data-slot"?: string;
    }) => (
      <div data-slot={dataSlot} {...rest}>
        {children}
      </div>
    ),
    Trigger: ({
      children,
      className,
      "data-slot": dataSlot,
      ...rest
    }: React.HTMLAttributes<HTMLButtonElement> & { "data-slot"?: string }) => (
      <button className={className} data-slot={dataSlot} {...rest}>
        {children}
      </button>
    ),
    Panel: ({
      children,
      className,
      "data-slot": dataSlot,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot} {...rest}>
        {children}
      </div>
    ),
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "../collapsible";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Collapsible component", () => {
  describe("Collapsible root", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger>Trigger</CollapsibleTrigger>
          <CollapsiblePanel>Content</CollapsiblePanel>
        </Collapsible>
      );
      const collapsible = container.querySelector("[data-slot='collapsible']");
      expect(collapsible).toBeTruthy();
    });
  });

  describe("CollapsibleTrigger", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger>Trigger</CollapsibleTrigger>
          <CollapsiblePanel>Content</CollapsiblePanel>
        </Collapsible>
      );
      const trigger = container.querySelector("[data-slot='collapsible-trigger']");
      expect(trigger).toBeTruthy();
    });

    it("renders trigger text", () => {
      const { container } = render(
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger>Click to expand</CollapsibleTrigger>
          <CollapsiblePanel>Content</CollapsiblePanel>
        </Collapsible>
      );
      expect(container.textContent).toContain("Click to expand");
    });

    it("supports custom className", () => {
      const { container } = render(
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="custom-trigger">Trigger</CollapsibleTrigger>
          <CollapsiblePanel>Content</CollapsiblePanel>
        </Collapsible>
      );
      const trigger = container.querySelector("[data-slot='collapsible-trigger']");
      expect(trigger?.className).toContain("custom-trigger");
    });
  });

  describe("CollapsiblePanel", () => {
    it("renders with data-slot attribute", () => {
      const { container } = render(
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger>Trigger</CollapsibleTrigger>
          <CollapsiblePanel>Content</CollapsiblePanel>
        </Collapsible>
      );
      const panel = container.querySelector("[data-slot='collapsible-panel']");
      expect(panel).toBeTruthy();
    });

    it("applies transition-height class", () => {
      const { container } = render(
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger>Trigger</CollapsibleTrigger>
          <CollapsiblePanel>Content</CollapsiblePanel>
        </Collapsible>
      );
      const panel = container.querySelector("[data-slot='collapsible-panel']");
      expect(panel?.className).toContain("transition-height");
    });

    it("applies height CSS variable binding", () => {
      const { container } = render(
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger>Trigger</CollapsibleTrigger>
          <CollapsiblePanel>Content</CollapsiblePanel>
        </Collapsible>
      );
      const panel = container.querySelector("[data-slot='collapsible-panel']");
      expect(panel?.className).toContain("h-(--collapsible-panel-height)");
    });

    it("applies overflow-hidden class", () => {
      const { container } = render(
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger>Trigger</CollapsibleTrigger>
          <CollapsiblePanel>Content</CollapsiblePanel>
        </Collapsible>
      );
      const panel = container.querySelector("[data-slot='collapsible-panel']");
      expect(panel?.className).toContain("overflow-hidden");
    });

    it("renders panel content", () => {
      const { container } = render(
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger>Trigger</CollapsibleTrigger>
          <CollapsiblePanel>Expanded content here</CollapsiblePanel>
        </Collapsible>
      );
      expect(container.textContent).toContain("Expanded content here");
    });

    it("supports custom className", () => {
      const { container } = render(
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger>Trigger</CollapsibleTrigger>
          <CollapsiblePanel className="custom-panel">Content</CollapsiblePanel>
        </Collapsible>
      );
      const panel = container.querySelector("[data-slot='collapsible-panel']");
      expect(panel?.className).toContain("custom-panel");
      expect(panel?.className).toContain("transition-height");
    });
  });
});
