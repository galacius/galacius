import { vi, describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";

// ─── hoisted mocks ────────────────────────────────────────────────────────────

vi.mock("@base-ui/react/select", () => ({
  Select: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({
      children,
      className,
      "data-slot": dataSlot,
      "data-size": dataSize,
    }: React.HTMLAttributes<HTMLButtonElement> & {
      "data-slot"?: string;
      "data-size"?: string;
    }) => (
      <button className={className} data-slot={dataSlot} data-size={dataSize}>
        {children}
      </button>
    ),
    Value: ({
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLSpanElement> & { "data-slot"?: string }) => (
      <span className={className} data-slot={dataSlot} />
    ),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Positioner: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
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
    Group: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    GroupLabel: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    Item: ({
      children,
      className,
      "data-slot": dataSlot,
    }: React.HTMLAttributes<HTMLDivElement> & { "data-slot"?: string }) => (
      <div className={className} data-slot={dataSlot}>
        {children}
      </div>
    ),
    ItemText: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    ItemIndicator: () => null,
    List: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Separator: ({ "data-slot": dataSlot }: { "data-slot"?: string }) => <hr data-slot={dataSlot} />,
    ScrollUpArrow: ({ "data-slot": dataSlot }: { "data-slot"?: string }) => (
      <div data-slot={dataSlot} />
    ),
    ScrollDownArrow: ({ "data-slot": dataSlot }: { "data-slot"?: string }) => (
      <div data-slot={dataSlot} />
    ),
    Icon: ({ render: renderProp }: { render?: React.ReactNode }) => renderProp || null,
  },
}));

// ─── imports after mocks ──────────────────────────────────────────────────────

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "../select";

// ─── tests ────────────────────────────────────────────────────────────────────

afterEach(cleanup);

describe("Select components", () => {
  describe("Select trigger", () => {
    it("renders trigger with data-slot", () => {
      const { container } = render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = container.querySelector("[data-slot='select-trigger']");
      expect(trigger).toBeTruthy();
    });

    it("applies base trigger styling", () => {
      const { container } = render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = container.querySelector("[data-slot='select-trigger']");
      expect(trigger?.className).toContain("w-fit");
      expect(trigger?.className).toContain("rounded-lg");
      expect(trigger?.className).toContain("border");
    });

    it("renders with default size", () => {
      const { container } = render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = container.querySelector("[data-slot='select-trigger']");
      expect(trigger?.getAttribute("data-size")).toBe("default");
      expect(trigger?.className).toContain("h-8");
    });

    it("renders with custom size sm", () => {
      const { container } = render(
        <Select>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = container.querySelector("[data-slot='select-trigger']");
      expect(trigger?.getAttribute("data-size")).toBe("sm");
      expect(trigger?.className).toContain("h-7");
    });

    it("applies error state styling", () => {
      const { container } = render(
        <Select>
          <SelectTrigger state="error">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = container.querySelector("[data-slot='select-trigger']");
      expect(trigger?.className).toContain("border-destructive");
      expect(trigger?.className).toContain("bg-destructive/5");
    });
  });

  describe("SelectValue", () => {
    it("renders value with data-slot", () => {
      const { container } = render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      const value = container.querySelector("[data-slot='select-value']");
      expect(value).toBeTruthy();
    });

    it("applies value styling", () => {
      const { container } = render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      const value = container.querySelector("[data-slot='select-value']");
      expect(value?.className).toContain("flex");
      expect(value?.className).toContain("flex-1");
    });
  });

  describe("SelectContent", () => {
    it("renders content with data-slot", () => {
      const { container } = render(
        <Select open={true}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      const content = container.querySelector("[data-slot='select-content']");
      expect(content).toBeTruthy();
    });

    it("applies content styling", () => {
      const { container } = render(
        <Select open={true}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      const content = container.querySelector("[data-slot='select-content']");
      expect(content?.className).toContain("bg-popover");
      expect(content?.className).toContain("rounded-lg");
    });
  });

  describe("SelectItem", () => {
    it("renders item with data-slot", () => {
      const { container } = render(
        <Select open={true}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      const item = container.querySelector("[data-slot='select-item']");
      expect(item).toBeTruthy();
    });

    it("renders item text", () => {
      const { container } = render(
        <Select open={true}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">First Option</SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container.textContent).toContain("First Option");
    });
  });

  describe("SelectGroup", () => {
    it("renders group with data-slot", () => {
      const { container } = render(
        <Select open={true}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Group</SelectLabel>
              <SelectItem value="1">Option 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      const group = container.querySelector("[data-slot='select-group']");
      expect(group).toBeTruthy();
    });
  });

  describe("SelectLabel", () => {
    it("renders label with data-slot", () => {
      const { container } = render(
        <Select open={true}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Group Label</SelectLabel>
              <SelectItem value="1">Option 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      const label = container.querySelector("[data-slot='select-label']");
      expect(label).toBeTruthy();
      expect(container.textContent).toContain("Group Label");
    });
  });

  describe("SelectSeparator", () => {
    it("renders separator with data-slot", () => {
      const { container } = render(
        <Select open={true}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectSeparator />
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );
      const separator = container.querySelector("[data-slot='select-separator']");
      expect(separator).toBeTruthy();
    });
  });
});
